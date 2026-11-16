"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PageTitle, Stat } from "@/components/admin/page-title";
import { formatDT } from "@/lib/format";
import { cn } from "@/lib/utils";

function Todo({ href, title, sub, n }: { href: string; title: string; sub: string; n: number | undefined }) {
  const urgent = (n ?? 0) > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[72px] items-center justify-between gap-3 rounded-[18px] border-[1.5px] bg-card px-4 py-3 text-ink no-underline hover:bg-[#0e3355]",
        urgent ? "border-red-text" : "border-line",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <strong className="text-base">{title}</strong>
        <span className="text-sm text-soft">{urgent ? sub : "Rien en attente"}</span>
      </span>
      <span className="flex items-center gap-2">
        <strong className="font-display text-[28px] leading-none">{n ?? "…"}</strong>
        <ChevronRight aria-hidden className="size-5 text-muted" />
      </span>
    </Link>
  );
}

const quick = [
  { href: "/admin/photos", label: "Prendre des photos" },
  { href: "/admin/produits", label: "Changer un prix ou un stock" },
  { href: "/admin/import", label: "Importer le catalogue (CSV)" },
  { href: "/admin/livraison", label: "Frais et société de livraison" },
];

export default function AdminHome() {
  const s = useQuery(api.admin.dashboard);
  const me = useQuery(api.profiles.me);
  return (
    <>
      <PageTitle title="Tableau de bord" subtitle="Ce qui attend votre action, puis l'état de la boutique." />
      <section aria-labelledby="todo" className="flex flex-col gap-3">
        <h2 id="todo" className="m-0 font-display text-[13px] tracking-[0.12em] text-red-text uppercase">À faire</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-3">
          <Todo href="/admin/commandes" title="Commandes à confirmer" sub="Par WhatsApp ou téléphone" n={s?.newOrders} />
          <Todo href="/admin/commandes" title="Commandes à expédier" sub="Confirmées, à remettre au livreur" n={s?.toShip} />
          <Todo href="/admin/revendeurs" title="Revendeurs à valider" sub="Vérifier la boutique" n={s?.pendingResellers} />
          {me?.isSuperAdmin && <Todo href="/admin/equipe" title="Demandes d'accès admin" sub="À valider ou refuser" n={s?.pendingAdmins} />}
        </div>
      </section>
      <section aria-labelledby="shop" className="flex flex-col gap-3">
        <h2 id="shop" className="m-0 font-display text-[13px] tracking-[0.12em] text-red-text uppercase">Boutique</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          <Stat label="Revendeurs actifs" value={s?.approvedResellers ?? "…"} />
          <Stat label="Frais de livraison" value={s ? formatDT(s.deliveryFee) : "…"} />
        </div>
      </section>
      <section aria-labelledby="quick" className="flex flex-col gap-3">
        <h2 id="quick" className="m-0 font-display text-[13px] tracking-[0.12em] text-red-text uppercase">Raccourcis</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="flex min-h-12 items-center justify-between gap-3 rounded-full border-[1.5px] border-line-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-card">
              {q.label}<ChevronRight aria-hidden className="size-4 text-muted" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
