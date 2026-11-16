"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Download, MessageCircle, Phone, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { PageTitle, Pill, PillRow, Stat } from "@/components/admin/page-title";
import { Modal } from "@/components/admin/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABEL, customerWhatsapp, formatDT, formatDate, localPhone, pieces } from "@/lib/format";

type Status = keyof typeof ORDER_STATUS_LABEL;
type Order = FunctionReturnType<typeof api.admin.orders>[number];

const BADGE: Record<Status, "warn" | "info" | "violet" | "ok" | "bad" | "default" | "white"> = {
  new: "warn", confirmed: "info", ready: "info", shipped: "violet", delivered: "ok", settled: "white", returned: "bad", cancelled: "bad",
};

/** Button wording for each next step. */
const ACTION: Record<Status, string> = {
  new: "", confirmed: "Confirmer", ready: "Prête au retrait", shipped: "Expédier", delivered: "Livrée",
  settled: "Argent reçu du livreur", returned: "Retour", cancelled: "Annuler",
};

const TABS: (Status | undefined)[] = ["new", "confirmed", "ready", "shipped", "delivered", "settled", "returned", "cancelled", undefined];

export default function OrdersPage() {
  const [status, setStatus] = useState<Status | undefined>("new");
  const [priceType, setPriceType] = useState<"retail" | "wholesale" | undefined>();
  const orders = useQuery(api.admin.orders, { status, priceType });
  const cod = useQuery(api.admin.codSummary);
  const exportRows = useQuery(api.admin.courierExport);
  const [dialog, setDialog] = useState<{ order: Order; to: Status } | null>(null);

  return (
    <>
      <PageTitle title="Commandes" subtitle="Paiement à la livraison : confirmer, expédier, encaisser.">
        <Button variant="secondary" size="sm" disabled={!exportRows?.length} onClick={() => exportRows && downloadCsv(exportRows)}>
          <Download aria-hidden className="size-4" /> CSV livreur ({exportRows?.length ?? 0})
        </Button>
      </PageTitle>

      {cod && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3" aria-label="Argent à la livraison">
          <Stat label={`Chez le livreur · ${cod.withCourierCount} colis`} value={formatDT(cod.withCourier)} />
          <Stat label={`En route · ${cod.inTransitCount} colis`} value={formatDT(cod.inTransit)} />
          <Stat label="Encaissé" value={formatDT(cod.settled)} />
          <Stat label={`Taux de retour · ${cod.returnedCount} retour${cod.returnedCount > 1 ? "s" : ""}`} value={cod.returnRate === null ? "—" : `${Math.round(cod.returnRate * 100)} %`} />
        </div>
      )}

      <PillRow>
        {TABS.map((s) => (
          <Pill key={s ?? "all"} on={status === s} onClick={() => setStatus(s)}>{s ? ORDER_STATUS_LABEL[s] : "Toutes"}</Pill>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
        <Pill on={priceType === "retail"} onClick={() => setPriceType(priceType === "retail" ? undefined : "retail")}>Détail</Pill>
        <Pill on={priceType === "wholesale"} onClick={() => setPriceType(priceType === "wholesale" ? undefined : "wholesale")}>Gros</Pill>
      </PillRow>

      {orders === undefined && <p className="m-0 text-muted">Chargement…</p>}
      {orders?.length === 0 && <p className="m-0 rounded-2xl border border-line bg-card p-5 text-muted">Aucune commande ici.</p>}
      <div className="flex flex-col gap-3">
        {orders?.map((o) => <OrderCard key={o._id} o={o} onAction={(to) => setDialog({ order: o, to })} />)}
      </div>

      {dialog && <StatusDialog order={dialog.order} to={dialog.to} onClose={() => setDialog(null)} />}
    </>
  );
}

function OrderCard({ o, onAction }: { o: Order; onAction: (to: Status) => void }) {
  const lines = o.items.map((i) => `${i.qty} x ${i.label}`).join(", ");
  const where = o.shippingMethod === "home" ? `${o.address}, ${o.city}, ${o.governorate}` : "retrait au magasin (Sfax Médina)";
  const confirmText =
    `Bonjour ${o.customerName}, ici ONEsource IT. Nous avons bien reçu votre commande #${o.ref} : ${lines}. ` +
    `Total à payer à la réception : ${formatDT(o.codAmount)}. ` +
    (o.shippingMethod === "home" ? `Livraison à : ${where}. ` : "Retrait au magasin, Sfax Médina. ") +
    "Pouvez-vous confirmer votre commande ? Merci !";

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <strong className="font-display text-lg">#{o.ref}</strong>
          <span className="text-[13px] text-muted">{formatDate(o.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={o.priceType === "wholesale" ? "white" : "default"}>{o.priceType === "wholesale" ? "Gros" : "Détail"}</Badge>
          <Badge variant={BADGE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1">
          <strong>{o.customerName}</strong>
          <span className="text-[15px] text-soft">{localPhone(o.phone)}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild variant="success" size="sm">
              <a href={customerWhatsapp(o.phone, confirmText)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden className="size-4" /> WhatsApp</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${o.phone}`}><Phone aria-hidden className="size-4" /> Appeler</a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[15px]">
          <span><span className="text-muted">{o.shippingMethod === "home" ? "Livraison :" : "Réception :"}</span> {where}</span>
          {o.note && <span><span className="text-muted">Note client :</span> {o.note}</span>}
          {o.confirmationNotes && <span><span className="text-muted">Confirmation :</span> {o.confirmationNotes}</span>}
          {o.trackingNumber && <span><span className="text-muted">Suivi :</span> {o.courierName} · <strong>{o.trackingNumber}</strong></span>}
          {o.cancelReason && <span className="text-bad-ink"><span className="text-muted">Motif :</span> {o.cancelReason}</span>}
        </div>
        <div className="flex flex-col items-start gap-0.5 md:items-end">
          <span className="text-[13px] text-muted">À encaisser</span>
          <strong className="font-display text-2xl">{formatDT(o.codAmount)}</strong>
          <span className="text-[13px] text-muted">{pieces(o.itemCount)}{o.shippingFee ? ` · livraison ${formatDT(o.shippingFee)}` : ""}</span>
        </div>
      </div>

      <details className="text-[15px]">
        <summary className="cursor-pointer text-muted">Articles</summary>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
          {o.items.map((i) => (
            <li key={i.label}>{i.label} × {i.qty} · {formatDT(i.unitPrice)} / pièce = <strong>{formatDT(i.unitPrice * i.qty)}</strong></li>
          ))}
        </ul>
      </details>

      {o.next.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {o.next.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "cancelled" || to === "returned" ? "ghost" : to === o.next[0] ? "default" : "outline"}
              onClick={() => onAction(to)}
            >
              {ACTION[to]}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}

/** Asks only what each step needs: a note, a reason, or the courier and tracking number. */
function StatusDialog({ order, to, onClose }: { order: Order; to: Status; onClose: () => void }) {
  const setOrderStatus = useMutation(api.admin.setOrderStatus);
  const settings = useQuery(api.admin.deliverySettings);
  const provider = useCourierProvider();
  const createShipment = useAction(api.couriers.push.createShipment);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [courier, setCourier] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");

  const title: Record<string, string> = {
    confirmed: `Confirmer #${order.ref}`,
    shipped: `Expédier #${order.ref}`,
    cancelled: `Annuler #${order.ref}`,
    returned: `Retour de #${order.ref}`,
    delivered: `#${order.ref} livrée`,
    ready: `#${order.ref} prête au retrait`,
    settled: `Argent reçu pour #${order.ref}`,
  };
  const help: Record<string, string> = {
    confirmed: "Le client a confirmé par téléphone ou WhatsApp.",
    shipped: "Le colis est remis au livreur. Le client verra le numéro de suivi.",
    cancelled: "Annulation avant l'envoi. Les pièces reviennent dans le stock.",
    returned: "Colis refusé ou client injoignable. Les pièces reviennent dans le stock.",
    delivered: order.shippingMethod === "home" ? "Le livreur a remis le colis et encaissé l'argent." : "Le client a retiré et payé au magasin.",
    ready: "La commande est préparée ; prévenez le client qu'il peut passer.",
    settled: `Le livreur vous a reversé ${formatDT(order.codAmount)}.`,
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (f.get(k) as string | null) ?? undefined;
    setBusy(true);
    setError(null);
    try {
      await setOrderStatus({
        orderId: order._id as Id<"orders">,
        status: to,
        confirmationNotes: s("notes"),
        cancelReason: s("reason"),
        courierName: s("courier"),
        trackingNumber: s("tracking"),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Échec. Réessayez.");
      setBusy(false);
    }
  }

  async function fromApi() {
    setBusy(true);
    setError(null);
    try {
      const res = await createShipment({ orderId: order._id });
      setCourier(res.courierName);
      setTracking(res.trackingNumber);
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Le livreur n'a pas répondu.");
    }
    setBusy(false);
  }

  return (
    <Modal title={title[to] ?? ORDER_STATUS_LABEL[to]} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="m-0 text-[15px] text-soft">{help[to]}</p>
        {to === "confirmed" && (
          <Label>Note de confirmation <span className="font-normal text-muted">(optionnel)</span>
            <Textarea name="notes" rows={2} maxLength={500} placeholder="Ex. confirmé sur WhatsApp, livrer après 17 h" />
          </Label>
        )}
        {(to === "cancelled" || to === "returned") && (
          <Label>Motif {to === "returned" && <span className="font-normal text-muted">(optionnel)</span>}
            <Input name="reason" required={to === "cancelled"} maxLength={300} placeholder={to === "cancelled" ? "Ex. client injoignable, doublon" : "Ex. refusé à la porte"} />
          </Label>
        )}
        {to === "shipped" && (
          <>
            {provider && (
              <Button type="button" variant="secondary" onClick={fromApi} disabled={busy}>
                <Truck aria-hidden className="size-4" /> Envoyer à {provider.name}
              </Button>
            )}
            <Label>Livreur
              <Input name="courier" required maxLength={80} value={courier ?? settings?.courierName ?? ""} onChange={(e) => setCourier(e.target.value)} placeholder="Ex. First Delivery" />
            </Label>
            <Label>Numéro de suivi
              <Input name="tracking" required maxLength={80} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Code-barres du bordereau" />
            </Label>
          </>
        )}
        {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={busy} variant={to === "cancelled" || to === "returned" ? "outline" : "default"}>{busy ? "…" : ACTION[to]}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Whether a courier API is plugged in (COURIER_PROVIDER on Convex). */
function useCourierProvider() {
  const get = useAction(api.couriers.push.provider);
  const [p, setP] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    get({}).then(setP).catch(() => setP(null));
  }, [get]);
  return p;
}

/** Semicolon CSV with a BOM so Excel opens accents and columns correctly. */
function downloadCsv(rows: FunctionReturnType<typeof api.admin.courierExport>) {
  const head = ["Order Ref", "Customer Name", "Phone", "Governorate", "City", "Address", "Product Summary", "COD Amount (TND)"];
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const body = rows.map((r) =>
    [r.ref, r.customerName, r.phone.replace(/^\+216/, ""), r.governorate, r.city, r.address, r.summary, (r.codAmount / 1000).toFixed(3)]
      .map(esc)
      .join(";"),
  );
  const blob = new Blob(["﻿" + [head.join(";"), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `livreur-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
