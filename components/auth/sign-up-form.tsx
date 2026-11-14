"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ACTIVITY_TYPES, GOVERNORATES } from "@/convex/rules";

const PHONE_PATTERN = "^(\\+?216|00216)?[\\s.\\-]*(\\d[\\s.\\-]*){8}$";
const legend = "mb-4 font-display text-xl font-bold";
const grid = "m-0 grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5 border-0 p-0";

export function SignUpForm() {
  const { signIn } = useAuthActions();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("passwordConfirm")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    form.delete("passwordConfirm");
    form.delete("terms");
    form.set("flow", "signUp");
    setBusy(true);
    try {
      await signIn("password", form);
      setSent(true);
    } catch (err) {
      const msg = err instanceof ConvexError ? String(err.data) : String((err as Error)?.message ?? "");
      setError(
        /already exists/i.test(msg)
          ? "Un compte existe déjà avec cet email. Connectez-vous."
          : err instanceof ConvexError
            ? msg
            : "L'inscription n'a pas abouti. Vérifiez vos informations et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-[18px] py-10">
        <div aria-hidden className="flex size-16 items-center justify-center rounded-full bg-[#3a1a22]"><Check className="size-8 text-cta" strokeWidth={2.4} /></div>
        <h2 className="m-0 font-display text-[32px]">Demande envoyée</h2>
        <p className="m-0 leading-relaxed text-soft">
          Votre compte est <strong className="text-ink">en attente de validation</strong>. Vous pouvez déjà commander au prix détail ; le prix de gros sera débloqué dès que notre équipe aura validé votre boutique.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/produits">Voir le catalogue</Link></Button>
          <Button asChild variant="outline"><Link href="/compte">Mon compte</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <fieldset className={grid}>
        <legend className={legend}>Votre boutique</legend>
        <Label>Nom commercial<Input name="shopName" required minLength={2} maxLength={120} placeholder="Ex. Phone Center Sfax" /></Label>
        <Label>Type d&apos;activité
          <NativeSelect name="activityType" required defaultValue="">
            <option value="">Choisir…</option>
            {ACTIVITY_TYPES.map((a) => <option key={a}>{a}</option>)}
          </NativeSelect>
        </Label>
        <Label>Matricule fiscal<Input name="taxId" maxLength={40} placeholder="0000000/A/M/000" /></Label>
        <Label>Registre de commerce (RNE)<Input name="rne" maxLength={40} placeholder="Optionnel" /></Label>
      </fieldset>

      <fieldset className={grid}>
        <legend className={legend}>Responsable</legend>
        <Label>Nom et prénom<Input name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></Label>
        <Label>Téléphone<Input name="phone" type="tel" required inputMode="tel" pattern={PHONE_PATTERN} title="+216 suivi de 8 chiffres" placeholder="+216 __ ___ ___" autoComplete="tel" /></Label>
        <Label>WhatsApp<Input name="whatsapp" type="tel" inputMode="tel" pattern={PHONE_PATTERN} title="+216 suivi de 8 chiffres" placeholder="Si différent du téléphone" /></Label>
        <Label>Email<Input name="email" type="email" required autoComplete="email" /></Label>
      </fieldset>

      <fieldset className={grid}>
        <legend className={legend}>Adresse</legend>
        <Label>Gouvernorat
          <NativeSelect name="governorate" required defaultValue="">
            <option value="">Choisir…</option>
            {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
          </NativeSelect>
        </Label>
        <Label>Ville<Input name="city" required maxLength={80} autoComplete="address-level2" /></Label>
        <Label className="col-span-full">Adresse de la boutique<Input name="address" required minLength={4} maxLength={200} autoComplete="street-address" /></Label>
      </fieldset>

      <fieldset className={grid}>
        <legend className={legend}>Accès</legend>
        <Label>Mot de passe<PasswordInput name="password" required minLength={8} autoComplete="new-password" /></Label>
        <Label>Confirmer le mot de passe<PasswordInput name="passwordConfirm" required minLength={8} autoComplete="new-password" /></Label>
      </fieldset>

      <label className="flex items-start gap-3 text-[15px]">
        <input name="terms" type="checkbox" required className="mt-0.5 size-[22px] flex-none accent-cta" />
        <span>J&apos;accepte les <Link href="/cgv" className="text-red-text">conditions générales de vente</Link> et la <Link href="/confidentialite" className="text-red-text">politique de confidentialité</Link>.</span>
      </label>

      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}

      <Button type="submit" size="lg" disabled={busy} className="w-full max-w-[360px]">
        {busy ? "Envoi…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
