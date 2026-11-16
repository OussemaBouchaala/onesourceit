"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageTitle } from "@/components/admin/page-title";
import { MoneyField } from "@/components/admin/catalog-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayPhone, parseDT } from "@/lib/format";
import { PHONE_HINT, PHONE_PATTERN } from "@/convex/rules";

/** Delivery settings only: changing them touches nothing else on the site. */
export default function DeliveryPage() {
  const settings = useQuery(api.admin.deliverySettings);
  const save = useMutation(api.admin.saveDeliverySettings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fee = parseDT(String(f.get("fee") ?? ""));
    const freeFrom = parseDT(String(f.get("freeFrom") ?? ""));
    if (fee === "invalid" || freeFrom === "invalid") return setMsg({ ok: false, text: "Montant invalide. Exemple : 7,000" });
    setBusy(true);
    setMsg(null);
    try {
      await save({
        fee,
        freeFrom,
        courierName: String(f.get("courierName") ?? ""),
        courierPhone: String(f.get("courierPhone") ?? ""),
      });
      setMsg({ ok: true, text: "Réglages de livraison enregistrés." });
    } catch (err) {
      setMsg({ ok: false, text: String((err as { data?: string })?.data ?? "Action impossible. Réessayez.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Livraison" subtitle="Frais, livraison gratuite et société de livraison." />
      {settings === undefined ? (
        <div className="h-[320px] animate-pulse rounded-[20px] bg-card" />
      ) : (
        <form onSubmit={submit} className="flex max-w-[560px] flex-col gap-4">
          <fieldset className="m-0 flex flex-col gap-4 rounded-[20px] border border-line bg-card p-4">
            <legend className="px-1.5 font-display text-lg font-bold">Frais de livraison</legend>
            <MoneyField name="fee" label="Livraison à domicile" value={settings.fee} />
            <p className="m-0 -mt-2 text-[13px] text-muted">Vide = seulement le retrait au magasin est proposé.</p>
            <MoneyField name="freeFrom" label="Livraison gratuite dès" value={settings.freeFrom} />
            <p className="m-0 -mt-2 text-[13px] text-muted">Montant du panier (prix détail) à partir duquel la livraison est offerte. Vide = jamais gratuite. Ne s&apos;applique pas aux revendeurs.</p>
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-4 rounded-[20px] border border-line bg-card p-4">
            <legend className="px-1.5 font-display text-lg font-bold">Société de livraison</legend>
            <Label>Nom<Input name="courierName" maxLength={80} defaultValue={settings.courierName ?? ""} placeholder="[Nom du livreur]" /></Label>
            <Label>Téléphone du livreur<Input name="courierPhone" type="tel" inputMode="tel" pattern={PHONE_PATTERN} title={PHONE_HINT} defaultValue={settings.courierPhone ? displayPhone(settings.courierPhone) : ""} placeholder="+216 __ ___ ___" /></Label>
            <p className="m-0 text-[13px] text-muted">
              Ce nom est proposé quand vous passez une commande en « Expédiée ». L&apos;envoi automatique par l&apos;API du livreur sera ajouté quand la société sera choisie.
            </p>
          </fieldset>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`m-0 rounded-xl px-3.5 py-3 text-sm font-medium ${msg.ok ? "bg-ok-soft text-[#0b5c47]" : "bg-bad-soft text-bad-ink"}`}>
              {msg.text}
            </p>
          )}
          <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        </form>
      )}
    </>
  );
}
