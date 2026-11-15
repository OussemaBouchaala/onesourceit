"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Pencil, Plus, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ArticleForm, type Product } from "@/components/admin/catalog-forms";
import { PageTitle, PillRow } from "@/components/admin/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, paginate } from "@/components/ui/pagination";
import { formatDT } from "@/lib/format";

const PER_PAGE = 12;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Articles (gammes): name, description, prices and visibility. Stock lives on Produits & stock. */
export default function ArticlesPage() {
  const data = useQuery(api.admin.catalog);
  const [dialog, setDialog] = useState<{ product?: Product } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "on" | "off">("all");
  const [page, setPage] = useState(1);

  if (!data) return <PageTitle title="Articles" subtitle="Chargement…" />;

  const list = data.products
    .filter((p) => (show === "all" || (show === "on") === p.isActive) && (!q.trim() || norm(`${p.name} ${p.description}`).includes(norm(q.trim()))))
    .sort((a, b) => a.name.localeCompare(b.name));
  const pg = paginate(list, page, PER_PAGE);

  return (
    <>
      <PageTitle title="Articles" subtitle="Chaque article (gamme) a un nom, une description et ses prix. Ses modèles et couleurs se gèrent dans « Produits & stock »." />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setDialog({})}><Plus aria-hidden className="size-4" />Nouvel article</Button>
        <Button asChild size="sm" variant="outline" className="border-line-strong"><Link href="/admin/produits">Produits &amp; stock</Link></Button>
      </div>
      {notice && <p role="status" className="m-0 rounded-xl bg-ok-soft px-3.5 py-3 text-sm font-medium text-ok-ink">{notice}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un article</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Rechercher un article…" className="pl-10" />
        </label>
        <PillRow aria-label="Visibilité">
          {([["all", "Tous"], ["on", "En vente"], ["off", "Masqués"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={show === k}
              onClick={() => { setShow(k); setPage(1); }}
              className={"min-h-11 rounded-full border-[1.5px] px-3.5 text-sm font-medium " + (show === k ? "border-white bg-white text-navy" : "border-line-strong bg-card text-ink")}
            >
              {l}
            </button>
          ))}
        </PillRow>
      </div>
      <p className="m-0 text-sm text-muted">{list.length} article{list.length > 1 ? "s" : ""}{pg.pageCount > 1 ? ` · page ${pg.page} / ${pg.pageCount}` : ""}</p>

      {list.length === 0 ? (
        <p className="m-0 rounded-[18px] border border-line bg-card p-5 text-muted">Aucun article. Créez-en un avec « Nouvel article ».</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-3">
          {pg.items.map((p) => {
            const stock = p.variants.reduce((n, v) => n + v.stock, 0);
            return (
              <article key={p._id} className="flex flex-col gap-2 rounded-[18px] border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-base leading-snug">{p.name}</strong>
                  <Badge variant={p.isActive ? "ok" : "bad"}>{p.isActive ? "En vente" : "Masqué"}</Badge>
                </div>
                {p.description && <p className="m-0 line-clamp-2 text-sm text-soft">{p.description}</p>}
                <span className="text-sm text-soft">Détail <strong className="text-ink">{formatDT(p.retailPrice)}</strong> · Gros <strong className="text-ink">{formatDT(p.wholesalePrice)}</strong></span>
                <span className="text-[13px] text-muted">{p.variants.length} variante{p.variants.length > 1 ? "s" : ""} · {stock} en stock · /produit/{p.slug}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => setDialog({ product: p })}><Pencil aria-hidden className="size-4" />Modifier</Button>
                  <Button asChild size="sm" variant="ghost"><Link href={`/admin/produits?article=${p._id}`}>Voir le stock</Link></Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination page={pg.page} pageCount={pg.pageCount} onChange={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

      {dialog && (
        <ArticleForm
          product={dialog.product}
          onClose={() => setDialog(null)}
          onDone={(msg) => { setDialog(null); setNotice(msg); }}
        />
      )}
    </>
  );
}
