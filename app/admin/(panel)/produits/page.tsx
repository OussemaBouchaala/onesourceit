"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageTitle, Pill, PillRow } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDT, parseDT, toDTInput } from "@/lib/format";

export default function ProductsAdminPage() {
  const data = useQuery(api.admin.catalog);
  const dash = useQuery(api.admin.dashboard);
  const [productId, setProductId] = useState<Id<"products"> | null>(null);
  const product = data?.products.find((p) => p._id === productId) ?? data?.products[0];

  if (!data) return <PageTitle title="Produits & stock" subtitle="Chargement…" />;

  return (
    <>
      <PageTitle title="Produits & stock" subtitle="Gammes, modèles, couleurs, stock et prix. Prix vides = « [XX] DT » sur le site." />
      <PillRow aria-label="Produit">
        {data.products.map((p) => (
          <Pill key={p._id} on={product?._id === p._id} onClick={() => setProductId(p._id)}>{p.name}</Pill>
        ))}
      </PillRow>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
        {product && <PricesCard key={product._id + String(product.retailPrice) + String(product.wholesalePrice)} product={product} />}
        {dash && <DeliveryFeeCard key={String(dash.deliveryFee)} fee={dash.deliveryFee} />}
      </div>

      {product && <VariantsTable product={product} brands={data.brands} models={data.models} colors={data.colors} />}
      <AddCard brands={data.brands} models={data.models} colors={data.colors} productId={product?._id} />
    </>
  );
}

type Catalog = FunctionReturnType<typeof api.admin.catalog>;
type Product = Catalog["products"][number];

function MoneyInput({ name, defaultValue, label }: { name: string; defaultValue: number | null; label: string }) {
  return (
    <Label>
      {label}
      <div className="relative">
        <Input name={name} defaultValue={toDTInput(defaultValue)} inputMode="decimal" placeholder="[XX]" className="pr-12" />
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">DT</span>
      </div>
    </Label>
  );
}

function PricesCard({ product }: { product: Product }) {
  const setPrices = useMutation(api.admin.setPrices);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const retail = parseDT(String(f.get("retail")));
        const wholesale = parseDT(String(f.get("wholesale")));
        if (retail === "invalid" || wholesale === "invalid") return setMsg("Prix invalide. Exemple : 20,000");
        await setPrices({ productId: product._id, retailPrice: retail, wholesalePrice: wholesale });
        setMsg("Prix enregistrés.");
      }}
    >
      <strong className="font-display text-lg">Prix · {product.name}</strong>
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput name="retail" label="Prix détail" defaultValue={product.retailPrice} />
        <MoneyInput name="wholesale" label="Prix en gros" defaultValue={product.wholesalePrice} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm">Enregistrer</Button>
        {msg && <span role="status" className="text-sm text-muted">{msg}</span>}
      </div>
    </form>
  );
}

function DeliveryFeeCard({ fee }: { fee: number | null }) {
  const setFee = useMutation(api.admin.setDeliveryFee);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = parseDT(String(new FormData(e.currentTarget).get("fee")));
        if (v === "invalid") return setMsg("Montant invalide.");
        await setFee({ fee: v });
        setMsg("Frais enregistrés.");
      }}
    >
      <strong className="font-display text-lg">Livraison à domicile</strong>
      <MoneyInput name="fee" label="Frais de livraison" defaultValue={fee} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm">Enregistrer</Button>
        <span role="status" className="text-sm text-muted">{msg ?? (fee === null ? "Non défini : seul le retrait est possible." : `Actuel : ${formatDT(fee)}`)}</span>
      </div>
    </form>
  );
}

function VariantsTable({
  product, brands, models, colors,
}: { product: Product; brands: Catalog["brands"]; models: Catalog["models"]; colors: Catalog["colors"] }) {
  const updateVariant = useMutation(api.admin.updateVariant);
  const photoCounts = useQuery(api.admin.photoCounts, { productId: product._id });
  const [brandFilter, setBrandFilter] = useState<string>("");
  const rows = useMemo(() => {
    const modelById = new Map(models.map((m) => [m._id, m]));
    const brandOrder = new Map(brands.map((b, i) => [b._id, i]));
    const colorOrder = new Map(colors.map((c, i) => [c._id, i]));
    return product.variants
      .filter((v) => !brandFilter || modelById.get(v.modelId)?.brandId === brandFilter)
      .sort((a, b) => {
        const ma = modelById.get(a.modelId), mb = modelById.get(b.modelId);
        return (brandOrder.get(ma!.brandId)! - brandOrder.get(mb!.brandId)!) || (ma!.sort - mb!.sort) || (colorOrder.get(a.colorId)! - colorOrder.get(b.colorId)!);
      });
  }, [product, brands, models, colors, brandFilter]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-xl">Stock par modèle et couleur</h2>
        <label className="flex items-center gap-2 text-sm">
          Marque
          <NativeSelect value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="min-h-10 w-auto py-1.5">
            <option value="">Toutes</option>
            {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </NativeSelect>
        </label>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Modèle · couleur</TableHead><TableHead>Photos</TableHead><TableHead>Stock</TableHead><TableHead>En vente</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted">Aucune variante. Ajoutez-en ci-dessous ou via l&apos;import CSV.</TableCell></TableRow>}
          {rows.map((v) => (
            <TableRow key={v._id}>
              <TableCell className="font-semibold whitespace-nowrap max-md:text-base">
                <span className="mr-2 inline-block size-4 rounded-full border border-white/20 align-middle" style={{ background: v.hex }} aria-hidden />
                {v.label}
              </TableCell>
              <TableCell label="Photos">{photoCounts?.[`${v.modelId}_${v.colorId}`] ?? 0}</TableCell>
              <TableCell label="Stock">
                <label className="sr-only" htmlFor={`stock-${v._id}`}>Stock {v.label}</label>
                <Input
                  id={`stock-${v._id}`}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={v.stock}
                  className="min-h-10 w-24 py-1.5"
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 0 && n !== v.stock) updateVariant({ variantId: v._id, stock: n, isActive: v.isActive });
                  }}
                />
              </TableCell>
              <TableCell label="En vente">
                <input
                  type="checkbox"
                  aria-label={`${v.label} en vente`}
                  checked={v.isActive}
                  onChange={(e) => updateVariant({ variantId: v._id, stock: v.stock, isActive: e.target.checked })}
                  className="size-6 accent-cta md:size-5"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function AddCard({
  brands, models, colors, productId,
}: { brands: Catalog["brands"]; models: Catalog["models"]; colors: Catalog["colors"]; productId?: Id<"products"> }) {
  const addModel = useMutation(api.admin.addModel);
  const addColor = useMutation(api.admin.addColor);
  const upsertVariant = useMutation(api.admin.upsertVariant);
  const [brandId, setBrandId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => setMsg(ok)).catch((e) => setMsg(String(e?.data ?? e?.message)));

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
      <form
        className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (!productId) return;
          run(upsertVariant({
            productId,
            modelId: f.get("modelId") as Id<"models">,
            colorId: f.get("colorId") as Id<"colors">,
            stock: Number(f.get("stock") || 0),
          }), "Variante ajoutée.");
        }}
      >
        <strong className="font-display text-lg">Ajouter une variante</strong>
        <Label>Marque
          <NativeSelect value={brandId} onChange={(e) => setBrandId(e.target.value)} required>
            <option value="">Choisir…</option>
            {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </NativeSelect>
        </Label>
        <Label>Modèle
          <NativeSelect name="modelId" required disabled={!brandId} defaultValue="">
            <option value="">Choisir…</option>
            {models.filter((m) => m.brandId === brandId).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </NativeSelect>
        </Label>
        <Label>Couleur
          <NativeSelect name="colorId" required defaultValue="">
            <option value="">Choisir…</option>
            {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </NativeSelect>
        </Label>
        <Label>Stock<Input name="stock" type="number" min={0} defaultValue={0} /></Label>
        <Button type="submit" size="sm" className="self-start">Ajouter</Button>
      </form>

      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(addModel({ brandId: f.get("brandId") as Id<"brands">, name: String(f.get("name")) }), "Modèle ajouté.");
            e.currentTarget.reset();
          }}
        >
          <strong className="font-display text-lg">Nouveau modèle</strong>
          <div className="grid grid-cols-2 gap-3">
            <Label>Marque
              <NativeSelect name="brandId" required defaultValue="">
                <option value="">Choisir…</option>
                {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </NativeSelect>
            </Label>
            <Label>Nom<Input name="name" required maxLength={60} placeholder="Galaxy A16" /></Label>
          </div>
          <Button type="submit" size="sm" className="self-start">Ajouter le modèle</Button>
        </form>
        <form
          className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(addColor({ name: String(f.get("name")), hex: String(f.get("hex")) }), "Couleur ajoutée.");
            e.currentTarget.reset();
          }}
        >
          <strong className="font-display text-lg">Nouvelle couleur</strong>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Label>Nom<Input name="name" required maxLength={40} placeholder="Lavande" /></Label>
            <Label>Teinte<input name="hex" type="color" defaultValue="#c8b6ff" className="h-12 w-16 rounded-xl border-[1.5px] border-line-strong bg-navy-deep" /></Label>
          </div>
          <Button type="submit" size="sm" className="self-start">Ajouter la couleur</Button>
        </form>
      </div>
      {msg && <p role="status" className="col-span-full m-0 text-sm text-muted">{msg}</p>}
    </section>
  );
}
