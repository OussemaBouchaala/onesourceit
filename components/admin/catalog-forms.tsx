"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Modal } from "@/components/admin/modal";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseDT, toDTInput } from "@/lib/format";

export type Catalog = FunctionReturnType<typeof api.admin.catalog>;
export type Product = Catalog["products"][number];

const errText = (e: unknown) => (e instanceof ConvexError ? String(e.data) : "Action impossible. Réessayez.");

/** Popup forms used by the Articles and Produits & stock pages. */
type FormProps = { onClose: () => void; onDone: (msg: string) => void };

function useSubmit(onDone: (msg: string) => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, msg: string) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onDone(msg);
    } catch (e) {
      setError(errText(e));
      setBusy(false);
    }
  }
  return { error, setError, busy, run };
}

function FormFooter({ busy, error, onClose, label = "Enregistrer" }: { busy: boolean; error: string | null; onClose: () => void; label?: string }) {
  return (
    <>
      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
      <div className="grid grid-cols-[1fr_2fr] gap-2.5 pt-1">
        <Button type="button" variant="outline" className="border-line-strong" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : label}</Button>
      </div>
    </>
  );
}

function MoneyField({ name, label, value }: { name: string; label: string; value: number | null }) {
  return (
    <Label>{label}
      <span className="relative">
        <Input name={name} defaultValue={toDTInput(value)} inputMode="decimal" placeholder="[XX]" className="pr-12" />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">DT</span>
      </span>
    </Label>
  );
}

export function ArticleForm({ product, onClose, onDone }: FormProps & { product?: Product }) {
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const setPrices = useMutation(api.admin.setPrices);
  const { error, setError, busy, run } = useSubmit(onDone);
  return (
    <Modal title={product ? "Modifier l'article" : "Nouvel article"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const retail = parseDT(String(fd.get("retail")));
          const wholesale = parseDT(String(fd.get("wholesale")));
          if (retail === "invalid" || wholesale === "invalid") return setError("Prix invalide. Exemple : 20,000");
          const name = String(fd.get("name"));
          const description = String(fd.get("description"));
          if (product) {
            run(async () => {
              await updateProduct({ productId: product._id, name, description, isActive: fd.get("active") === "on" });
              await setPrices({ productId: product._id, retailPrice: retail, wholesalePrice: wholesale });
            }, "Article enregistré.");
          } else {
            run(() => createProduct({ name, description, retailPrice: retail, wholesalePrice: wholesale }), "Article créé. Ajoutez-lui des variantes avec « + Variante ».");
          }
        }}
      >
        <Label>Nom<Input name="name" required minLength={2} maxLength={80} defaultValue={product?.name} placeholder="Ex. Verre trempé 9H" /></Label>
        <Label>Description<Textarea name="description" rows={3} maxLength={2000} defaultValue={product?.description} placeholder="Matière, finition, compatibilité…" /></Label>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField name="retail" label="Prix détail" value={product?.retailPrice ?? null} />
          <MoneyField name="wholesale" label="Prix de gros" value={product?.wholesalePrice ?? null} />
        </div>
        {product && (
          <label className="flex min-h-11 items-center gap-3 text-[15px]">
            <input name="active" type="checkbox" defaultChecked={product.isActive} className="size-6 accent-cta" />
            En vente sur le site
          </label>
        )}
        {product && <p className="m-0 text-[13px] text-muted">Adresse de la page : /produit/{product.slug} (ne change pas).</p>}
        <FormFooter busy={busy} error={error} onClose={onClose} label={product ? "Enregistrer" : "Créer l'article"} />
      </form>
    </Modal>
  );
}

export function VariantForm({ data, defaultProduct, onClose, onDone }: FormProps & { data: Catalog; defaultProduct: string }) {
  const upsertVariant = useMutation(api.admin.upsertVariant);
  const { error, busy, run } = useSubmit(onDone);
  const [brandId, setBrandId] = useState("");
  return (
    <Modal title="Nouvelle variante" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => upsertVariant({
            productId: fd.get("productId") as Id<"products">,
            modelId: fd.get("modelId") as Id<"models">,
            colorId: fd.get("colorId") as Id<"colors">,
            stock: Number(fd.get("stock") || 0),
          }), "Variante enregistrée.");
        }}
      >
        <Label>Article
          <NativeSelect name="productId" required defaultValue={defaultProduct}>
            <option value="">Choisir…</option>
            {data.products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </NativeSelect>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label>Marque
            <NativeSelect value={brandId} onChange={(e) => setBrandId(e.target.value)} required>
              <option value="">Choisir…</option>
              {data.brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </NativeSelect>
          </Label>
          <Label>Modèle
            <NativeSelect name="modelId" required disabled={!brandId} defaultValue="">
              <option value="">Choisir…</option>
              {data.models.filter((m) => m.brandId === brandId).sort((a, b) => a.sort - b.sort).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </NativeSelect>
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Label>Couleur
            <NativeSelect name="colorId" required defaultValue="">
              <option value="">Choisir…</option>
              {data.colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </NativeSelect>
          </Label>
          <Label>Stock<Input name="stock" type="number" min={0} defaultValue={0} /></Label>
        </div>
        <p className="m-0 text-[13px] text-muted">Modèle ou couleur absent ? Ajoutez-le d&apos;abord avec « + Modèle » ou « + Couleur ».</p>
        <FormFooter busy={busy} error={error} onClose={onClose} label="Ajouter la variante" />
      </form>
    </Modal>
  );
}

export function ModelForm({ data, onClose, onDone }: FormProps & { data: Catalog }) {
  const addModel = useMutation(api.admin.addModel);
  const { error, busy, run } = useSubmit(onDone);
  return (
    <Modal title="Nouveau modèle" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => addModel({ brandId: fd.get("brandId") as Id<"brands">, name: String(fd.get("name")) }), "Modèle ajouté.");
        }}
      >
        <Label>Marque
          <NativeSelect name="brandId" required defaultValue="">
            <option value="">Choisir…</option>
            {data.brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </NativeSelect>
        </Label>
        <Label>Nom du modèle<Input name="name" required maxLength={60} placeholder="Ex. Galaxy A16" /></Label>
        <FormFooter busy={busy} error={error} onClose={onClose} label="Ajouter le modèle" />
      </form>
    </Modal>
  );
}

export function BrandForm({ onClose, onDone }: FormProps) {
  const addBrand = useMutation(api.admin.addBrand);
  const { error, busy, run } = useSubmit(onDone);
  return (
    <Modal title="Nouvelle marque" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addBrand({ name: String(new FormData(e.currentTarget).get("name")) }), "Marque ajoutée. Ajoutez-lui des modèles avec « + Modèle ».");
        }}
      >
        <Label>Nom de la marque<Input name="name" required maxLength={40} placeholder="Ex. Oppo" /></Label>
        <FormFooter busy={busy} error={error} onClose={onClose} label="Ajouter la marque" />
      </form>
    </Modal>
  );
}

export function ColorForm({ onClose, onDone }: FormProps) {
  const addColor = useMutation(api.admin.addColor);
  const { error, busy, run } = useSubmit(onDone);
  return (
    <Modal title="Nouvelle couleur" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => addColor({ name: String(fd.get("name")), hex: String(fd.get("hex")) }), "Couleur ajoutée.");
        }}
      >
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Label>Nom<Input name="name" required maxLength={40} placeholder="Ex. Lavande" /></Label>
          <Label>Teinte<input name="hex" type="color" defaultValue="#c8b6ff" className="h-12 w-16 rounded-xl border-[1.5px] border-line-strong bg-navy-deep" /></Label>
        </div>
        <FormFooter busy={busy} error={error} onClose={onClose} label="Ajouter la couleur" />
      </form>
    </Modal>
  );
}

export function DeliveryForm({ fee, onClose, onDone }: FormProps & { fee: number | null }) {
  const setFee = useMutation(api.admin.setDeliveryFee);
  const { error, setError, busy, run } = useSubmit(onDone);
  return (
    <Modal title="Frais de livraison" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseDT(String(new FormData(e.currentTarget).get("fee")));
          if (v === "invalid") return setError("Montant invalide. Exemple : 7,000");
          run(() => setFee({ fee: v }), "Frais de livraison enregistrés.");
        }}
      >
        <MoneyField name="fee" label="Livraison à domicile" value={fee} />
        <p className="m-0 text-[13px] text-muted">Laissez vide pour proposer seulement le retrait au magasin.</p>
        <FormFooter busy={busy} error={error} onClose={onClose} />
      </form>
    </Modal>
  );
}
