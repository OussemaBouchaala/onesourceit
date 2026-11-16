"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Banknote, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCart } from "./cart-context";
import { Steps } from "./steps";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDT, pieces } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  GOVERNORATES,
  MAX_RETAIL_QTY,
  WHOLESALE_MIN_QTY,
  WHOLESALE_STEP,
  isValidWholesaleQty,
} from "@/convex/rules";

export function Checkout() {
  const router = useRouter();
  const cart = useCart();
  const priced = useQuery(api.catalog.priceCart, { variantIds: cart.lines.map((l) => l.variantId) });
  const placeOrder = useMutation(api.orders.placeOrder);
  const [step, setStep] = useState<0 | 1>(0);
  const [ship, setShip] = useState<"home" | "pickup">("pickup");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const wholesale = priced?.priceType === "wholesale";
  const step5 = wholesale ? WHOLESALE_STEP : 1;
  const min = wholesale ? WHOLESALE_MIN_QTY : 1;

  const rows = cart.lines.map((l) => ({ ...l, info: priced?.lines.find((p) => p.variantId === l.variantId) }));
  const anyMissingPrice = rows.some((r) => r.info && r.info.unitPrice === null);
  const subtotal = anyMissingPrice
    ? null
    : rows.reduce((a, r) => a + (r.info?.unitPrice ?? 0) * r.qty, 0);
  const fee = ship === "home" ? (priced?.deliveryFee ?? null) : 0;
  const total = subtotal === null || fee === null ? null : subtotal + fee;
  const badQty = wholesale && rows.some((r) => !isValidWholesaleQty(r.qty));
  const unavailable = rows.some((r) => r.info && !r.info.available);
  const blocked = cart.lines.length === 0 || anyMissingPrice || badQty || unavailable || !priced;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (f.get(k) as string | null) ?? undefined;
    setSending(true);
    try {
      const res = await placeOrder({
        items: cart.lines,
        shippingMethod: ship,
        customerName: s("customerName") ?? "",
        phone: s("phone") ?? "",
        governorate: ship === "home" ? s("governorate") : undefined,
        city: ship === "home" ? s("city") : undefined,
        address: ship === "home" ? s("address") : undefined,
        note: s("note"),
      });
      cart.clear();
      router.push(`/commande/${res.publicId}`);
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "La commande n'a pas pu être envoyée. Réessayez.");
      setSending(false);
    }
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-5">
        <Title />
        <div className="flex flex-col items-center gap-4 rounded-[20px] border border-line bg-card px-5 py-10 text-center">
          <p className="m-0 text-[17px]">Votre panier est vide.</p>
          <Button asChild><Link href="/produits">Voir les produits</Link></Button>
        </div>
      </main>
    );
  }

  const summaryCta =
    step === 0 ? (
      <Button className="w-full" size="lg" disabled={blocked} onClick={() => setStep(1)}>
        Passer la commande
      </Button>
    ) : (
      <Button className="w-full" size="lg" type="submit" form="checkout" disabled={blocked || sending}>
        {sending ? "Envoi…" : "Confirmer la commande"}
      </Button>
    );

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pt-6 pb-[clamp(32px,8vw,96px)] sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Title />
        <Steps current={step} />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-4">
          {step === 0 && (
            <>
              {rows.map((r) => (
                <article key={r.variantId} className="flex items-center gap-4 rounded-[20px] border border-line bg-card p-4">
                  <div aria-hidden className="flex h-[88px] w-[72px] flex-none items-center justify-center rounded-[14px] bg-navy">
                    <div className="h-[68px] w-[34px] rounded-[10px] border border-white/15" style={{ background: r.info?.hex ?? "#3a5878" }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <strong>{r.info?.productName ?? "…"}</strong>
                        <span className="text-sm text-muted">{r.info?.label}</span>
                        {r.info && !r.info.available && <span className="text-sm text-red-text">Plus disponible, retirez cet article.</span>}
                      </div>
                      <button type="button" onClick={() => cart.remove(r.variantId)} aria-label={`Retirer ${r.info?.label ?? "l'article"}`} className="-mt-2.5 -mr-2.5 inline-flex size-11 flex-none items-center justify-center text-muted hover:text-red-text">
                        <Trash2 aria-hidden className="size-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center rounded-full border border-line-strong">
                        <button type="button" aria-label="Diminuer" disabled={r.qty - step5 < min} onClick={() => cart.setQty(r.variantId, r.qty - step5)} className="inline-flex size-11 items-center justify-center disabled:opacity-40"><Minus aria-hidden className="size-4" /></button>
                        <span aria-live="polite" className="min-w-9 text-center font-semibold">{r.qty}</span>
                        <button type="button" aria-label="Augmenter" disabled={!wholesale && r.qty >= MAX_RETAIL_QTY} onClick={() => cart.setQty(r.variantId, r.qty + step5)} className="inline-flex size-11 items-center justify-center disabled:opacity-40"><Plus aria-hidden className="size-4" /></button>
                      </div>
                      <div className="flex flex-col items-end">
                        <strong className="font-display text-xl">{r.info?.unitPrice != null ? formatDT(r.info.unitPrice * r.qty) : "[XX] DT"}</strong>
                        <span className="text-[13px] text-muted">{formatDT(r.info?.unitPrice)} / pièce</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {badQty && (
                <p className="m-0 rounded-xl bg-warn-soft px-3.5 py-3 text-sm text-warn-ink">
                  Prix de gros : minimum {WHOLESALE_MIN_QTY} pièces par modèle et couleur, par multiples de {WHOLESALE_STEP}. Ajustez les quantités.
                </p>
              )}
              {anyMissingPrice && (
                <p className="m-0 rounded-xl bg-warn-soft px-3.5 py-3 text-sm text-warn-ink">
                  Un prix n&apos;est pas encore défini. Contactez-nous sur WhatsApp pour cette commande.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <form id="checkout" onSubmit={submit} className="flex flex-col gap-4">
              <fieldset className="m-0 flex flex-col gap-3 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]">
                <legend className="px-1.5 font-display text-lg font-bold">Mode de réception</legend>
                {([
                  ["pickup", "Retrait au magasin", "Avenue des Martyrs, Sfax Médina", "Gratuit"],
                  ["home", "Livraison à domicile", "Partout en Tunisie, sous [X] jours ouvrés", formatDT(priced?.deliveryFee)],
                ] as const).map(([value, label, hint, price]) => (
                  <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-4 has-disabled:cursor-not-allowed has-disabled:opacity-60", ship === value ? "border-cta bg-[#3a1a22]" : "border-line-strong")}>
                    <input type="radio" name="ship" value={value} checked={ship === value} disabled={value === "home" && priced?.deliveryFee === null} onChange={() => setShip(value)} className="mt-0.5 size-5 flex-none accent-cta" />
                    <span className="flex flex-1 flex-col gap-0.5"><strong>{label}</strong><span className="text-sm text-muted">{value === "home" && priced?.deliveryFee === null ? "Bientôt disponible : frais de livraison à définir" : hint}</span></span>
                    <strong className="text-[15px]">{price}</strong>
                  </label>
                ))}
              </fieldset>

              <fieldset className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]">
                <legend className="px-1.5 font-display text-lg font-bold">Vos coordonnées</legend>
                <Label>Nom et prénom<Input name="customerName" required minLength={2} maxLength={120} autoComplete="name" /></Label>
                <Label>Téléphone<Input name="phone" type="tel" required inputMode="tel" placeholder="+216 __ ___ ___" autoComplete="tel" pattern="^(\+?216|00216)?[\s.\-]*(\d[\s.\-]*){8}$" title="+216 suivi de 8 chiffres" /></Label>
                {ship === "home" && (
                  <>
                    <Label>Gouvernorat
                      <NativeSelect name="governorate" required defaultValue="">
                        <option value="">Choisir…</option>
                        {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
                      </NativeSelect>
                    </Label>
                    <Label>Ville<Input name="city" required maxLength={80} autoComplete="address-level2" /></Label>
                    <Label className="col-span-full">Adresse complète<Input name="address" required minLength={4} maxLength={200} autoComplete="street-address" /></Label>
                  </>
                )}
                <Label className="col-span-full">
                  <span>Note pour la commande <span className="font-normal text-muted">(optionnel)</span></span>
                  <Textarea name="note" rows={2} maxLength={500} />
                </Label>
              </fieldset>

              <div className="flex items-start gap-3 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]">
                <Banknote aria-hidden className="size-6 flex-none text-[#5fd3a8]" />
                <div className="flex flex-col gap-0.5">
                  <strong>Paiement à la réception</strong>
                  <span className="text-sm text-muted">En espèces au livreur ou au magasin. Nous vous appelons pour confirmer avant l&apos;envoi.</span>
                </div>
              </div>
              {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
            </form>
          )}
        </div>

        <aside aria-label="Récapitulatif" className="sticky top-24 flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]">
          <strong className="font-display text-xl">Récapitulatif</strong>
          <div className="flex justify-between text-[15px]"><span>Sous-total ({pieces(cart.count)})</span><span>{formatDT(subtotal)}</span></div>
          <div className="flex justify-between text-[15px]"><span>Livraison</span><span>{step === 0 ? "Calculée à l'étape suivante" : ship === "pickup" ? "Gratuit" : formatDT(fee)}</span></div>
          <div className="flex items-baseline justify-between border-t border-line pt-3"><strong>Total</strong><strong className="font-display text-[26px]">{formatDT(step === 0 ? subtotal : total)}</strong></div>
          <span className="text-[13px] text-muted">{wholesale ? "Prix de gros revendeur" : "Prix détail TTC"} · paiement à la livraison</span>
          <div className="mt-1 hidden flex-col gap-2.5 md:flex">
            {summaryCta}
            {step === 1 && <Button variant="ghost" onClick={() => setStep(0)}>← Modifier le panier</Button>}
          </div>
        </aside>
      </div>

      {/* Phone: total and action pinned to the bottom of the screen */}
      <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-card px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] md:hidden">
        <div className="flex flex-col">
          <span className="text-[13px] text-[#c9d2de]">Total · {pieces(cart.count)}</span>
          <strong className="font-display text-[22px]">{formatDT(step === 0 ? subtotal : total)}</strong>
        </div>
        <div className="flex items-center gap-1">
          {step === 1 && <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Retour</Button>}
          {step === 0 ? (
            <Button disabled={blocked} onClick={() => setStep(1)}>Commander</Button>
          ) : (
            <Button type="submit" form="checkout" disabled={blocked || sending}>{sending ? "Envoi…" : "Confirmer"}</Button>
          )}
        </div>
      </div>
    </main>
  );
}

function Title() {
  return (
    <h1 className="m-0 font-display text-[clamp(30px,8vw,44px)] leading-none font-bold uppercase">
      Mon <em className="text-red-text">panier</em>
    </h1>
  );
}
