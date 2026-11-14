"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Steps } from "./steps";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABEL, formatDT, formatDate, whatsappLink } from "@/lib/format";

export function OrderConfirmation({ publicId }: { publicId: string }) {
  const order = useQuery(api.orders.byPublicId, { publicId });

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-8 sm:px-5">
      <Steps current={2} />
      {order === undefined ? (
        <div className="h-[320px] animate-pulse rounded-[20px] bg-card" />
      ) : order === null ? (
        <p>Commande introuvable.</p>
      ) : (
        <div role="status" className="flex flex-col items-start gap-4 rounded-[20px] border border-line bg-card p-[clamp(24px,6vw,48px)]">
          <div aria-hidden className="flex size-16 items-center justify-center rounded-full bg-ok-soft">
            <Check className="size-8 text-ok" strokeWidth={2.4} />
          </div>
          <h1 className="m-0 font-display text-[clamp(26px,6vw,34px)]">Commande reçue</h1>
          <p className="m-0 leading-relaxed text-soft">
            Commande <strong className="text-ink">#{order.ref}</strong> du {formatDate(order.createdAt)} ·{" "}
            <strong className="text-ink">{formatDT(order.total)}</strong>. Notre équipe vous appelle sous peu pour confirmer{" "}
            {order.shippingMethod === "home" ? "la livraison" : "le retrait au magasin"}.
          </p>
          <ul className="m-0 flex w-full list-none flex-col gap-2 border-t border-line p-0 pt-4 text-[15px]">
            {order.items.map((i) => (
              <li key={i.label} className="flex justify-between gap-3">
                <span>{i.label} <span className="text-muted">× {i.qty}</span></span>
                <span>{formatDT(i.unitPrice * i.qty)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 text-muted">
              <span>{order.shippingMethod === "home" ? "Livraison" : "Retrait à Sfax"}</span>
              <span>{order.shippingFee ? formatDT(order.shippingFee) : "Gratuit"}</span>
            </li>
            <li className="flex justify-between gap-3 font-semibold">
              <span>Total · paiement à la réception</span>
              <span>{formatDT(order.total)}</span>
            </li>
          </ul>
          <p className="m-0 text-sm text-muted">Statut : {ORDER_STATUS_LABEL[order.status]}. Gardez ce lien pour suivre votre commande.</p>
          <div className="flex w-full flex-wrap gap-2.5">
            <Button asChild variant="success" className="flex-[1_1_220px]">
              <a href={whatsappLink(`Bonjour, je vous contacte au sujet de ma commande #${order.ref}.`)} target="_blank" rel="noopener noreferrer">
                Suivre sur WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-[1_1_220px]">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
