"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageTitle, Pill, PillRow } from "@/components/admin/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROFILE_STATUS_LABEL, formatDate, whatsappLink } from "@/lib/format";

type Status = keyof typeof PROFILE_STATUS_LABEL;

export default function ResellersPage() {
  const [status, setStatus] = useState<Status | undefined>("pending");
  const rows = useQuery(api.admin.resellers, { status });
  const setResellerStatus = useMutation(api.admin.setResellerStatus);
  const [refusing, setRefusing] = useState<Id<"profiles"> | null>(null);
  const [reason, setReason] = useState("");

  return (
    <>
      <PageTitle title="Revendeurs" subtitle="Vérifiez chaque boutique avant de débloquer le prix de gros." />
      <PillRow>
        <Pill on={status === "pending"} onClick={() => setStatus("pending")}>Inscriptions en attente</Pill>
        <Pill on={status === "approved"} onClick={() => setStatus("approved")}>Validés</Pill>
        <Pill on={status === "refused"} onClick={() => setStatus("refused")}>Refusés</Pill>
        <Pill on={!status} onClick={() => setStatus(undefined)}>Tous</Pill>
      </PillRow>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Boutique</TableHead><TableHead>Responsable</TableHead><TableHead>Adresse</TableHead>
            <TableHead>Matricule / RNE</TableHead><TableHead>Statut</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows === undefined && <TableRow><TableCell colSpan={6} className="text-muted">Chargement…</TableCell></TableRow>}
          {rows?.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted">Aucun revendeur dans cette liste.</TableCell></TableRow>}
          {rows?.map((r) => (
            <TableRow key={r._id}>
              <TableCell><strong>{r.shopName}</strong><br /><span className="text-[13px] text-muted">{r.activityType} · {formatDate(r.createdAt)}</span></TableCell>
              <TableCell label="Responsable" className="max-md:col-span-2">
                {r.fullName}<br />
                <a href={`tel:${r.phone}`} className="text-[13px] text-muted">{r.phone}</a>
                {" · "}
                <a href={whatsappLink().replace(/\d+$/, (r.whatsapp ?? r.phone).replace("+", ""))} target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted">WhatsApp</a>
                <br /><a href={`mailto:${r.email}`} className="text-[13px] text-muted">{r.email}</a>
              </TableCell>
              <TableCell label="Adresse" className="md:min-w-[180px]">{r.address}<br /><span className="text-[13px] text-muted">{r.city}, {r.governorate}</span></TableCell>
              <TableCell label="Matricule / RNE" className="font-mono text-sm">{r.taxId ?? "—"}<br />{r.rne ?? "—"}</TableCell>
              <TableCell label="Statut">
                <Badge variant={r.status === "approved" ? "ok" : r.status === "pending" ? "warn" : "bad"}>{PROFILE_STATUS_LABEL[r.status]}</Badge>
                {r.refusalReason && <div className="mt-1 max-w-[200px] text-[13px] text-muted">{r.refusalReason}</div>}
              </TableCell>
              <TableCell className="max-md:col-span-2">
                {refusing === r._id ? (
                  <form
                    className="flex min-w-[220px] flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setResellerStatus({ profileId: r._id, status: "refused", reason });
                      setRefusing(null);
                      setReason("");
                    }}
                  >
                    <label className="sr-only" htmlFor={`reason-${r._id}`}>Motif du refus</label>
                    <Input id={`reason-${r._id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel)" maxLength={300} />
                    <div className="flex gap-2">
                      <Button size="sm" type="submit">Confirmer le refus</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setRefusing(null)}>Annuler</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="success" onClick={() => setResellerStatus({ profileId: r._id, status: "approved" })}>Valider</Button>
                    )}
                    {r.status !== "refused" && (
                      <Button size="sm" variant="outline" className="border-line-strong" onClick={() => setRefusing(r._id)}>
                        {r.status === "approved" ? "Retirer l'accès" : "Refuser"}
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
