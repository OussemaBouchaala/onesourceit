"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { PageTitle } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseDT, toDTInput } from "@/lib/format";

/**
 * Delivery settings, kept apart from the catalogue: fee, free-delivery
 * threshold, delay shown at checkout, and the courier's contact details.
 * API keys never go here (Convex environment variables only).
 */
export default function DeliveryPage() {
  const s = useQuery(api.admin.deliverySettings);
  const save = useMutation(api.admin.setDeliverySettings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!s) return <PageTitle title="Livraison" subtitle="Chargement…" />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (k: string) => String(f.get(k) ?? "");
    const fee = parseDT(t("fee"));
    const freeFrom = parseDT(t("freeFrom"));
    if (fee === null || fee === "invalid") return setMsg({ ok: false, text: "Frais de livraison invalides (ex. 7,000)." });
    if (freeFrom === "invalid") return setMsg({ ok: false, text: "Seuil de livraison offerte invalide (ex. 150,000), ou laissez vide." });
    setBusy(true);
    setMsg(null);
    try {
      await save({
        fee,
        freeFrom,
        courierName: t("courierName"),
        courierPhone: t("courierPhone"),
        courierEmail: t("courierEmail"),
        courierNotes: t("courierNotes"),
        deliveryDelay: t("deliveryDelay"),
      });
      setMsg({ ok: true, text: "Enregistré. Le panier utilise ces valeurs tout de suite." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ConvexError ? String(err.data) : "Échec. Réessayez." });
    }
    setBusy(false);
  }

  const card = "m-0 grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]";
  return (
    <>
      <PageTitle title="Livraison" subtitle="Frais, délai et société de livraison. Ne change rien d'autre sur le site." />
      <form onSubmit={submit} className="flex max-w-[860px] flex-col gap-4">
        <fieldset className={card}>
          <legend className="px-1.5 font-display text-lg font-bold">Prix de la livraison à domicile</legend>
          <Label>Frais de livraison (DT)
            <Input name="fee" inputMode="decimal" required defaultValue={toDTInput(s.fee)} placeholder="7,000" />
            {s.feeIsDefault && <span className="text-[13px] font-normal text-muted">Valeur par défaut, pas encore enregistrée.</span>}
          </Label>
          <Label>Livraison offerte à partir de (DT)
            <Input name="freeFrom" inputMode="decimal" defaultValue={toDTInput(s.freeFrom)} placeholder="Vide = jamais offerte" />
          </Label>
          <Label className="col-span-full">Délai affiché au client
            <Input name="deliveryDelay" maxLength={120} defaultValue={s.deliveryDelay} placeholder="2 à 5 jours ouvrés" />
          </Label>
        </fieldset>

        <fieldset className={card}>
          <legend className="px-1.5 font-display text-lg font-bold">Société de livraison</legend>
          <Label>Nom
            <Input name="courierName" maxLength={120} defaultValue={s.courierName} placeholder="Ex. First Delivery, Intigo, Navex, Aramex" />
            <span className="text-[13px] font-normal text-muted">Proposé par défaut quand vous expédiez une commande.</span>
          </Label>
          <Label>Téléphone du livreur
            <Input name="courierPhone" type="tel" maxLength={120} defaultValue={s.courierPhone} placeholder="+216 __ ___ ___" />
          </Label>
          <Label>Email
            <Input name="courierEmail" type="email" maxLength={120} defaultValue={s.courierEmail} />
          </Label>
          <Label className="col-span-full">Notes internes
            <Textarea name="courierNotes" rows={3} maxLength={500} defaultValue={s.courierNotes} placeholder="Ex. numéro de compte client, heure de ramassage, tarif négocié" />
          </Label>
          <p className="col-span-full m-0 text-[13px] text-muted">
            Les clés d&apos;API d&apos;un livreur ne s&apos;écrivent jamais ici : elles sont ajoutées par le développeur dans les réglages sécurisés du serveur.
          </p>
        </fieldset>

        {msg && <p role="status" className={`m-0 rounded-xl px-3.5 py-3 text-sm font-medium ${msg.ok ? "bg-ok-soft text-ok-ink" : "bg-bad-soft text-bad-ink"}`}>{msg.text}</p>}
        <Button type="submit" disabled={busy} className="self-start">{busy ? "Enregistrement…" : "Enregistrer"}</Button>
      </form>
    </>
  );
}
