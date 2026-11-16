"use client";

import { Fragment, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { ChevronDown, Download, Phone } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { PageTitle, Pill, PillRow, Stat } from "@/components/admin/page-title";
import { Modal } from "@/components/admin/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_LABEL, displayPhone, formatDT, formatDate, pieces } from "@/lib/format";
import { courierCsv } from "@/convex/couriers";

type Status = keyof typeof ORDER_STATUS_LABEL;
type Order = FunctionReturnType<typeof api.admin.orders>[number];

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-warn-soft text-warn-ink",
  confirmed: "bg-[#e8eefb] text-[#1d3a7a]",
  ready: "bg-[#e8eefb] text-[#1d3a7a]",
  shipped: "bg-[#efe8fb] text-[#4b2a85]",
  delivered: "bg-ok-soft text-[#0b5c47]",
  settled: "bg-[#d4efe2] text-[#0b5c47]",
  returned: "bg-bad-soft text-bad-ink",
  cancelled: "bg-bad-soft text-bad-ink",
};

const GROUPS: { key: string; label: string; statuses?: Status[] }[] = [
  { key: "new", label: "À confirmer", statuses: ["new"] },
  { key: "confirmed", label: "Confirmées", statuses: ["confirmed", "ready"] },
  { key: "shipped", label: "Expédiées", statuses: ["shipped"] },
  { key: "delivered", label: "Livrées", statuses: ["delivered"] },
  { key: "done", label: "Terminées", statuses: ["settled", "returned", "cancelled"] },
  { key: "all", label: "Toutes" },
];

/** Button label for each move, from the order's point of view. */
function actionLabel(to: Status, pickup: boolean) {
  switch (to) {
    case "confirmed": return "✓ Confirmer";
    case "ready": return "Prête au retrait";
    case "shipped": return "🚚 Expédier";
    case "delivered": return "Livrée";
    case "settled": return pickup ? "Retirée et payée" : "💰 Encaissée";
    case "returned": return "Retournée";
    case "cancelled": return "Annuler";
    case "new": return "Rouvrir";
  }
}

function whatsappConfirm(o: Order) {
  const where = o.shippingMethod === "home" ? `Livraison : ${o.address}, ${o.city}, ${o.governorate}` : "Retrait au magasin, Sfax";
  const text =
    `Bonjour ${o.customerName}, ici ONEsource IT.\n` +
    `Pour confirmer votre commande ${o.ref} : ${o.itemsSummary}.\n` +
    `Total à payer à la réception : ${formatDT(o.total)}.\n${where}.\n` +
    `Répondez OUI pour confirmer. Merci !`;
  return `https://wa.me/${o.phone.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

export default function OrdersPage() {
  const [group, setGroup] = useState("new");
  const [priceType, setPriceType] = useState<"retail" | "wholesale" | undefined>();
  const [open, setOpen] = useState<Id<"orders"> | null>(null);
  const [dialog, setDialog] = useState<{ kind: "cancel" | "shipped" | "returned"; order: Order } | null>(null);
  const statuses = GROUPS.find((g) => g.key === group)?.statuses;
  const orders = useQuery(api.admin.orders, { statuses, priceType });
  const summary = useQuery(api.admin.codSummary);
  const setOrderStatus = useMutation(api.admin.setOrderStatus);
  const convex = useConvex();
  const [error, setError] = useState<string | null>(null);

  function move(o: Order, to: Status) {
    setError(null);
    if (to === "cancelled") return setDialog({ kind: "cancel", order: o });
    if (to === "shipped") return setDialog({ kind: "shipped", order: o });
    if (to === "returned") return setDialog({ kind: "returned", order: o });
    setOrderStatus({ orderId: o._id, status: to }).catch((err) => setError(String(err?.data ?? err?.message)));
  }

  async function exportCsv() {
    setError(null);
    const rows = await convex.query(api.admin.courierExport, {});
    if (rows.length === 0) return setError("Aucune commande confirmée à livrer à domicile.");
    const blob = new Blob(["﻿" + courierCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `livreur-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageTitle title="Commandes" subtitle="Paiement à la livraison : confirmez, expédiez, encaissez." />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Chez le livreur" value={summary ? formatDT(summary.withCourier) : "…"} />
        <Stat label="Encaissé" value={summary ? formatDT(summary.settled) : "…"} />
        <Stat label="Taux de retour" value={summary ? (summary.returnRate === null ? "—" : `${Math.round(summary.returnRate * 100)} %`) : "…"} />
      </div>
      <p className="m-0 -mt-2 text-[13px] text-muted">« Chez le livreur » : commandes livrées dont l&apos;argent n&apos;est pas encore reçu.</p>
      <PillRow>
        {GROUPS.map((g) => (
          <Pill key={g.key} on={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</Pill>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
        <Pill on={priceType === "retail"} onClick={() => setPriceType(priceType === "retail" ? undefined : "retail")}>Détail</Pill>
        <Pill on={priceType === "wholesale"} onClick={() => setPriceType(priceType === "wholesale" ? undefined : "wholesale")}>Gros</Pill>
      </PillRow>
      {group === "confirmed" && (
        <div className="flex flex-col gap-1.5">
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={exportCsv}>
            <Download aria-hidden className="size-4" />Export CSV pour le livreur
          </Button>
          <span className="text-[13px] text-muted">Commandes confirmées à livrer à domicile. Les retraits au magasin ne sont pas inclus.</span>
        </div>
      )}
      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm text-bad-ink">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commande</TableHead><TableHead>Client</TableHead><TableHead>Tarif</TableHead>
            <TableHead>Articles</TableHead><TableHead>À encaisser</TableHead><TableHead>Réception</TableHead><TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders === undefined && <TableRow><TableCell colSpan={7} className="text-muted">Chargement…</TableCell></TableRow>}
          {orders?.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted">Aucune commande ici.</TableCell></TableRow>}
          {orders?.map((o) => (
            <Fragment key={o._id}>
              <TableRow>
                <TableCell className="whitespace-nowrap max-md:flex max-md:items-baseline max-md:justify-between">
                  <button type="button" onClick={() => setOpen(open === o._id ? null : o._id)} aria-expanded={open === o._id} className="flex min-h-11 items-center gap-1 font-semibold md:min-h-0">
                    #{o.ref}<ChevronDown aria-hidden className={`size-4 transition-transform ${open === o._id ? "rotate-180" : ""}`} />
                  </button>
                  <span className="text-[13px] text-muted md:block">{formatDate(o.createdAt)}</span>
                </TableCell>
                <TableCell label="Client" className="whitespace-nowrap">
                  {o.customerName}<br />
                  <span className="flex flex-wrap items-center gap-x-3">
                    <a href={`tel:${o.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] text-red-text md:min-h-0 md:text-[13px] md:text-muted">
                      <Phone aria-hidden className="size-4 md:hidden" />{displayPhone(o.phone)}
                    </a>
                    {o.status === "new" && (
                      <a href={whatsappConfirm(o)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ok md:min-h-0 md:text-[13px]">
                        WhatsApp
                      </a>
                    )}
                  </span>
                </TableCell>
                <TableCell label="Tarif"><Badge variant={o.priceType === "wholesale" ? "white" : "default"}>{o.priceType === "wholesale" ? "Gros" : "Détail"}</Badge></TableCell>
                <TableCell label="Articles" className="whitespace-nowrap">{pieces(o.itemCount)}</TableCell>
                <TableCell label="À encaisser" className="font-semibold whitespace-nowrap">{formatDT(o.total)}</TableCell>
                <TableCell label="Réception" className="whitespace-nowrap">{o.shippingMethod === "home" ? `Domicile · ${o.governorate}` : "Retrait magasin"}</TableCell>
                <TableCell label="Statut" className="max-md:col-span-2">
                  <div className="flex flex-col gap-2">
                    <span className={`self-start rounded-full px-2.5 py-1 text-[13px] font-semibold ${STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                    {o.trackingNumber && o.status === "shipped" && <span className="text-[13px] text-muted">{o.courierName} · {o.trackingNumber}</span>}
                    {o.cancelReason && (o.status === "cancelled" || o.status === "returned") && <span className="text-[13px] text-muted">Raison : {o.cancelReason}</span>}
                    {o.next.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {o.next.map((to) => (
                          <Button
                            key={to}
                            type="button"
                            size="sm"
                            variant={to === "cancelled" || to === "returned" || to === "new" ? "outline" : "secondary"}
                            className="min-h-11 flex-[1_1_auto] border-line-strong md:min-h-9"
                            onClick={() => move(o, to)}
                          >
                            {actionLabel(to, o.shippingMethod === "pickup")}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {open === o._id && (
                <TableRow className="bg-navy-deep/50 max-md:-mt-2 max-md:bg-navy-deep">
                  <TableCell colSpan={7}><OrderDetail orderId={o._id} address={o.shippingMethod === "home" ? `${o.address}, ${o.city}, ${o.governorate}` : null} note={o.note} /></TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      {dialog && <StatusDialog {...dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

const CANCEL_REASONS = ["Client injoignable", "Client a changé d'avis", "Commande en double", "Article indisponible"];
const RETURN_REASONS = ["Colis refusé", "Client injoignable", "Adresse introuvable"];

function StatusDialog({ kind, order, onClose }: { kind: "cancel" | "shipped" | "returned"; order: Order; onClose: () => void }) {
  const setOrderStatus = useMutation(api.admin.setOrderStatus);
  const settings = useQuery(api.admin.deliverySettings);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(kind === "returned" ? RETURN_REASONS[0] : CANCEL_REASONS[0]);
  const title = kind === "cancel" ? `Annuler ${order.ref}` : kind === "returned" ? `Retour de ${order.ref}` : `Expédier ${order.ref}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const other = String(f.get("other") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      if (kind === "shipped") {
        await setOrderStatus({
          orderId: order._id,
          status: "shipped",
          courierName: String(f.get("courierName") ?? ""),
          trackingNumber: String(f.get("trackingNumber") ?? ""),
        });
      } else {
        await setOrderStatus({
          orderId: order._id,
          status: kind === "cancel" ? "cancelled" : "returned",
          reason: reason === "Autre" ? other : reason,
        });
      }
      onClose();
    } catch (err) {
      setError(String((err as { data?: string })?.data ?? (err as Error).message));
      setBusy(false);
    }
  }

  const reasons = kind === "returned" ? RETURN_REASONS : CANCEL_REASONS;
  return (
    <Modal title={title} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {kind === "shipped" ? (
          settings === undefined ? (
            <p className="m-0 text-muted">Chargement…</p>
          ) : (
            <>
              <Label>Livreur<Input name="courierName" required maxLength={80} defaultValue={settings.courierName ?? ""} placeholder="Nom de la société de livraison" /></Label>
              <Label>N° de suivi<Input name="trackingNumber" maxLength={60} placeholder="Code-barres du colis (facultatif)" /></Label>
              <p className="m-0 text-[13px] text-muted">Le client voit le livreur et le numéro de suivi sur sa page de commande.</p>
            </>
          )
        ) : (
          <>
            <Label>Raison
              <NativeSelect value={reason} onChange={(e) => setReason(e.target.value)}>
                {[...reasons, "Autre"].map((r) => <option key={r}>{r}</option>)}
              </NativeSelect>
            </Label>
            {reason === "Autre" && <Label>Précisez<Input name="other" required maxLength={300} /></Label>}
            <p className="m-0 text-[13px] text-muted">Les pièces reviennent en stock.</p>
          </>
        )}
        {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
        <div className="grid grid-cols-[1fr_2fr] gap-2.5 pt-1">
          <Button type="button" variant="outline" className="border-line-strong" onClick={onClose}>Retour</Button>
          <Button type="submit" disabled={busy}>
            {busy ? "…" : kind === "cancel" ? "Annuler la commande" : kind === "returned" ? "Marquer retournée" : "Marquer expédiée"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetail({ orderId, address, note }: { orderId: Id<"orders">; address: string | null; note: string | null }) {
  const items = useQuery(api.admin.orderItems, { orderId });
  return (
    <div className="flex flex-col gap-2 text-sm">
      {address && <span><span className="text-muted">Adresse :</span> {address}</span>}
      {note && <span><span className="text-muted">Note :</span> {note}</span>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {items?.map((i) => (
          <li key={i.label}>{i.label} × {i.qty} · {formatDT(i.unitPrice)} / pièce = <strong>{formatDT(i.unitPrice * i.qty)}</strong></li>
        ))}
      </ul>
    </div>
  );
}
