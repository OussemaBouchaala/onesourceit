"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageTitle } from "@/components/admin/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

type Row = FunctionReturnType<typeof api.admin.team>[number];

// Super admin only: the query and mutation refuse everyone else.
export default function TeamPage() {
  const rows = useQuery(api.admin.team);
  const setAdminStatus = useMutation(api.admin.setAdminStatus);
  const [refusing, setRefusing] = useState<Id<"profiles"> | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function set(profileId: Id<"profiles">, status: "approved" | "refused", why?: string) {
    setError(null);
    try {
      await setAdminStatus({ profileId, status, reason: why });
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Action impossible. Réessayez.");
    }
  }

  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  const team = rows?.filter((r) => r.status === "approved") ?? [];
  const refused = rows?.filter((r) => r.status === "refused") ?? [];

  function card(r: Row) {
    return (
      <article key={r._id} className="flex flex-col gap-3 rounded-[18px] border border-line bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-base">{r.fullName}</strong>
            <a href={`mailto:${r.email}`} className="truncate text-sm text-muted">{r.email}</a>
            <a href={`tel:${r.phone}`} className="text-sm text-muted">{r.phone}</a>
            <span className="text-[13px] text-muted">Demandé le {formatDate(r.createdAt)}</span>
          </div>
          {r.superAdmin ? <Badge variant="bad">Super admin</Badge>
            : r.status === "approved" ? <Badge variant="ok">Admin</Badge>
            : r.status === "pending" ? <Badge variant="warn">En attente</Badge>
            : <Badge variant="bad">Refusé</Badge>}
        </div>
        {r.refusalReason && <p className="m-0 text-[13px] text-muted">Motif : {r.refusalReason}</p>}
        {!r.superAdmin && (refusing === r._id ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              set(r._id, "refused", reason);
              setRefusing(null);
              setReason("");
            }}
          >
            <label className="sr-only" htmlFor={`reason-${r._id}`}>Motif</label>
            <Input id={`reason-${r._id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel)" maxLength={300} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit">{r.status === "approved" ? "Confirmer le retrait" : "Confirmer le refus"}</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setRefusing(null)}>Annuler</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {r.status !== "approved" && <Button size="sm" variant="success" onClick={() => set(r._id, "approved")}>Valider</Button>}
            {r.status !== "refused" && (
              <Button size="sm" variant="outline" onClick={() => { setRefusing(r._id); setReason(""); }}>
                {r.status === "approved" ? "Retirer l'accès" : "Refuser"}
              </Button>
            )}
          </div>
        ))}
      </article>
    );
  }

  const section = (title: string, list: Row[], empty: string) => (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-[13px] tracking-[0.12em] text-red-text uppercase">{title} · {list.length}</h2>
      {list.length === 0 ? <p className="m-0 text-sm text-muted">{empty}</p> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">{list.map(card)}</div>
      )}
    </section>
  );

  return (
    <>
      <PageTitle title="Équipe" subtitle="Validez les demandes d'accès admin. Un admin retiré perd l'accès immédiatement." />
      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm text-bad-ink">{error}</p>}
      {rows === undefined ? <div className="h-40 animate-pulse rounded-[18px] bg-card" /> : (
        <>
          {section("En attente", pending, "Aucune demande en attente.")}
          {section("Admins", team, "Aucun admin.")}
          {refused.length > 0 && section("Refusés ou retirés", refused, "")}
        </>
      )}
    </>
  );
}
