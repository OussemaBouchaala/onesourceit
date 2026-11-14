"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageTitle, Stat } from "@/components/admin/page-title";
import { formatDT } from "@/lib/format";

export default function AdminHome() {
  const s = useQuery(api.admin.dashboard);
  return (
    <>
      <PageTitle title="Tableau de bord" subtitle="Vue d'ensemble de la boutique." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
        <Stat label="Nouvelles commandes" value={s?.newOrders ?? "…"} />
        <Stat label="Inscriptions en attente" value={s?.pendingResellers ?? "…"} />
        <Stat label="Revendeurs actifs" value={s?.approvedResellers ?? "…"} />
        <Stat label="Frais de livraison" value={s ? formatDT(s.deliveryFee) : "…"} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/commandes" className="text-red-text">Voir les commandes →</Link>
        <Link href="/admin/revendeurs" className="text-red-text">Traiter les inscriptions →</Link>
        <Link href="/admin/import" className="text-red-text">Importer photos et catalogue →</Link>
      </div>
    </>
  );
}
