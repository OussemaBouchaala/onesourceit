"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Plus, Search, SlidersHorizontal, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ColorForm, DeliveryForm, ModelForm, BrandForm, VariantForm } from "@/components/admin/catalog-forms";
import { PageTitle, PillRow } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, paginate } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDT, parseDT } from "@/lib/format";
import { cn } from "@/lib/utils";

type Dialog =
  | { kind: "variante" }
  | { kind: "modele" }
  | { kind: "marque" }
  | { kind: "couleur" }
  | { kind: "livraison" }
  | null;

const PER_PAGE = 20;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const EMPTY = { q: "", productId: "", brandId: "", modelId: "", colorId: "", min: "", max: "" };

export default function ProductsAdminPage() {
  const data = useQuery(api.admin.catalog);
  const dash = useQuery(api.admin.dashboard);
  const updateVariant = useMutation(api.admin.updateVariant);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // ?article=<id> comes from "Voir le stock" on the Articles page.
  const [f, setF] = useState({ ...EMPTY, productId: useSearchParams().get("article") ?? "" });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const set = (patch: Partial<typeof EMPTY>) => { setF((x) => ({ ...x, ...patch })); setPage(1); };
  const activeFilters = [f.productId, f.brandId, f.modelId, f.colorId, f.min, f.max].filter(Boolean).length;

  const rows = useMemo(() => {
    if (!data) return [];
    const modelById = new Map(data.models.map((m) => [m._id, m]));
    const brandOrder = new Map(data.brands.map((b, i) => [b._id, i]));
    const colorOrder = new Map(data.colors.map((c, i) => [c._id, i]));
    const min = parseDT(f.min);
    const max = parseDT(f.max);
    const q = norm(f.q.trim());
    return data.products
      .flatMap((p) => p.variants.map((v) => ({ ...v, product: p, brandId: modelById.get(v.modelId)?.brandId })))
      .filter((r) =>
        (!f.productId || r.product._id === f.productId) &&
        (!f.brandId || r.brandId === f.brandId) &&
        (!f.modelId || r.modelId === f.modelId) &&
        (!f.colorId || r.colorId === f.colorId) &&
        (typeof min !== "number" || (r.product.retailPrice ?? -1) >= min) &&
        (typeof max !== "number" || (r.product.retailPrice !== null && r.product.retailPrice <= max)) &&
        (!q || norm(`${r.product.name} ${r.label}`).includes(q)),
      )
      .sort((a, b) => {
        const ma = modelById.get(a.modelId), mb = modelById.get(b.modelId);
        return a.product.name.localeCompare(b.product.name) ||
          ((brandOrder.get(ma?.brandId as Id<"brands">) ?? 0) - (brandOrder.get(mb?.brandId as Id<"brands">) ?? 0)) ||
          ((ma?.sort ?? 0) - (mb?.sort ?? 0)) ||
          ((colorOrder.get(a.colorId) ?? 0) - (colorOrder.get(b.colorId) ?? 0));
      });
  }, [data, f]);

  if (!data) return <PageTitle title="Produits & stock" subtitle="Chargement…" />;

  const pg = paginate(rows, page, PER_PAGE);
  const priceError = parseDT(f.min) === "invalid" || parseDT(f.max) === "invalid";
  const done = (msg: string) => { setDialog(null); setNotice(msg); };

  return (
    <>
      <PageTitle title="Produits & stock" subtitle="Stock et mise en vente par modèle et couleur. Les noms et prix des articles se règlent dans « Articles »." />

      <PillRow aria-label="Ajouter">
        <Button asChild size="sm" variant="secondary"><Link href="/admin/articles">Articles</Link></Button>
        {([["variante", "Variante"], ["modele", "Modèle"], ["marque", "Marque"], ["couleur", "Couleur"]] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant="outline" className="border-line-strong" onClick={() => setDialog({ kind: k })}>
            <Plus aria-hidden className="size-4" />{l}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="border-line-strong" onClick={() => setDialog({ kind: "livraison" })}>
          <Truck aria-hidden className="size-4" />Livraison · {dash ? formatDT(dash.deliveryFee) : "…"}
        </Button>
      </PillRow>
      {notice && <p role="status" className="m-0 rounded-xl bg-ok-soft px-3.5 py-3 text-sm font-medium text-ok-ink">{notice}</p>}

      <section aria-labelledby="stock" className="flex flex-col gap-3">
        <h2 id="stock" className="m-0 font-display text-xl">Stock par modèle et couleur</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Rechercher : modèle, couleur, article…" className="pl-10" type="search" />
          </label>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            className={cn("min-h-12", !showFilters && "border-line-strong")}
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal aria-hidden className="size-4" />Filtres{activeFilters > 0 ? ` · ${activeFilters}` : ""}
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 gap-3 rounded-[18px] border border-line bg-card p-4 md:grid-cols-3 lg:grid-cols-6">
            <Label>Article
              <NativeSelect value={f.productId} onChange={(e) => set({ productId: e.target.value })}>
                <option value="">Tous</option>
                {data.products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </NativeSelect>
            </Label>
            <Label>Marque
              <NativeSelect value={f.brandId} onChange={(e) => set({ brandId: e.target.value, modelId: "" })}>
                <option value="">Toutes</option>
                {data.brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </NativeSelect>
            </Label>
            <Label>Modèle
              <NativeSelect value={f.modelId} onChange={(e) => set({ modelId: e.target.value })}>
                <option value="">Tous</option>
                {data.models.filter((m) => !f.brandId || m.brandId === f.brandId).sort((a, b) => a.sort - b.sort).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </NativeSelect>
            </Label>
            <Label>Couleur
              <NativeSelect value={f.colorId} onChange={(e) => set({ colorId: e.target.value })}>
                <option value="">Toutes</option>
                {data.colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </NativeSelect>
            </Label>
            <Label>Prix détail min (DT)<Input value={f.min} onChange={(e) => set({ min: e.target.value })} inputMode="decimal" placeholder="0" /></Label>
            <Label>Prix détail max (DT)<Input value={f.max} onChange={(e) => set({ max: e.target.value })} inputMode="decimal" placeholder="—" /></Label>
            {priceError && <p role="alert" className="col-span-full m-0 text-sm text-red-text">Prix invalide. Exemple : 20,000</p>}
            {activeFilters > 0 && (
              <button type="button" onClick={() => set({ ...EMPTY, q: f.q })} className="col-span-full min-h-11 justify-self-start text-sm font-semibold text-red-text">
                Effacer les filtres
              </button>
            )}
          </div>
        )}
        <p className="m-0 text-sm text-muted">
          {rows.length} résultat{rows.length > 1 ? "s" : ""}{pg.pageCount > 1 ? ` · page ${pg.page} / ${pg.pageCount}` : ""}
        </p>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Modèle · couleur</TableHead><TableHead>Article</TableHead><TableHead>Photos</TableHead><TableHead>Stock</TableHead><TableHead>En vente</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted">Aucune variante ne correspond. Changez les filtres ou ajoutez une variante.</TableCell></TableRow>
            )}
            {pg.items.map((v) => (
              <TableRow key={v._id}>
                <TableCell className="font-semibold whitespace-nowrap max-md:text-base">
                  <span className="mr-2 inline-block size-4 rounded-full border border-white/20 align-middle" style={{ background: v.hex }} aria-hidden />
                  {v.label}
                </TableCell>
                <TableCell label="Article" className="max-md:col-span-2">
                  {v.product.name}<span className="block text-[13px] text-muted">Détail {formatDT(v.product.retailPrice)}</span>
                </TableCell>
                <TableCell label="Photos">{v.photoCount}</TableCell>
                <TableCell label="Stock">
                  <label className="sr-only" htmlFor={`stock-${v._id}`}>Stock {v.label}</label>
                  <Input
                    key={`${v._id}-${v.stock}`}
                    id={`stock-${v._id}`}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={v.stock}
                    className="min-h-11 w-24 py-1.5"
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
        <Pagination page={pg.page} pageCount={pg.pageCount} onChange={(p) => { setPage(p); document.getElementById("stock")?.scrollIntoView({ behavior: "smooth" }); }} />
      </section>

      {dialog?.kind === "variante" && <VariantForm data={data} defaultProduct={f.productId} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "modele" && <ModelForm data={data} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "marque" && <BrandForm onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "couleur" && <ColorForm onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "livraison" && <DeliveryForm fee={dash?.deliveryFee ?? null} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
}

