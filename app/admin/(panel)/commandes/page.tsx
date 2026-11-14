"use client";

import { Fragment, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Phone } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageTitle, Pill, PillRow } from "@/components/admin/page-title";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_LABEL, formatDT, formatDate } from "@/lib/format";

type Status = keyof typeof ORDER_STATUS_LABEL;
const STATUS_BG: Record<Status, string> = {
  new: "#fff4e5", confirmed: "#e8eefb", shipped: "#efe8fb", delivered: "#e3f4ec", cancelled: "#fbe9e9",
};

export default function OrdersPage() {
  const [status, setStatus] = useState<Status | undefined>();
  const [priceType, setPriceType] = useState<"retail" | "wholesale" | undefined>();
  const [open, setOpen] = useState<Id<"orders"> | null>(null);
  const orders = useQuery(api.admin.orders, { status, priceType });
  const setOrderStatus = useMutation(api.admin.setOrderStatus);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageTitle title="Commandes" subtitle="Commandes passées depuis le panier. Paiement à la livraison." />
      <PillRow>
        <Pill on={!status} onClick={() => setStatus(undefined)}>Toutes</Pill>
        {(Object.keys(ORDER_STATUS_LABEL) as Status[]).map((s) => (
          <Pill key={s} on={status === s} onClick={() => setStatus(s)}>{ORDER_STATUS_LABEL[s]}</Pill>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
        <Pill on={priceType === "retail"} onClick={() => setPriceType(priceType === "retail" ? undefined : "retail")}>Détail</Pill>
        <Pill on={priceType === "wholesale"} onClick={() => setPriceType(priceType === "wholesale" ? undefined : "wholesale")}>Gros</Pill>
      </PillRow>
      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm text-bad-ink">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commande</TableHead><TableHead>Client</TableHead><TableHead>Tarif</TableHead>
            <TableHead>Articles</TableHead><TableHead>Total</TableHead><TableHead>Réception</TableHead><TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders === undefined && <TableRow><TableCell colSpan={7} className="text-muted">Chargement…</TableCell></TableRow>}
          {orders?.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted">Aucune commande.</TableCell></TableRow>}
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
                  <a href={`tel:${o.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] text-red-text md:min-h-0 md:text-[13px] md:text-muted">
                    <Phone aria-hidden className="size-4 md:hidden" />{o.phone}
                  </a>
                </TableCell>
                <TableCell label="Tarif"><Badge variant={o.priceType === "wholesale" ? "white" : "default"}>{o.priceType === "wholesale" ? "Gros" : "Détail"}</Badge></TableCell>
                <TableCell label="Articles" className="whitespace-nowrap">{o.itemCount} pièce{o.itemCount > 1 ? "s" : ""}</TableCell>
                <TableCell label="Total" className="font-semibold whitespace-nowrap">{formatDT(o.total)}</TableCell>
                <TableCell label="Réception" className="whitespace-nowrap">{o.shippingMethod === "home" ? `Domicile · ${o.governorate}` : "Retrait magasin"}</TableCell>
                <TableCell label="Statut" className="max-md:col-span-2">
                  <label className="sr-only" htmlFor={`st-${o._id}`}>Statut de {o.ref}</label>
                  <select
                    id={`st-${o._id}`}
                    value={o.status}
                    onChange={(e) => {
                      setError(null);
                      setOrderStatus({ orderId: o._id, status: e.target.value as Status }).catch((err) => setError(String(err?.data ?? err?.message)));
                    }}
                    className="min-h-11 w-full rounded-[10px] border border-line-strong px-2.5 text-[15px] text-navy md:min-h-10 md:w-auto md:text-sm"
                    style={{ background: STATUS_BG[o.status] }}
                  >
                    {(Object.keys(ORDER_STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                  </select>
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
    </>
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
