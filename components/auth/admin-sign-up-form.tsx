"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const PHONE_PATTERN = "^(\\+?216|00216)?[\\s.\\-]*(\\d[\\s.\\-]*){8}$";

/** Admin access request. The account stays pending until the super admin approves it. */
export function AdminSignUpForm() {
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
    form.set("flow", "signUp");
    form.set("kind", "admin");
    setBusy(true);
    try {
      await signIn("password", form);
      setSent(true);
    } catch (err) {
      const msg = err instanceof ConvexError ? String(err.data) : String((err as Error)?.message ?? "");
      setError(
        /already exists/i.test(msg)
          ? "Un compte existe déjà avec cet email."
          : err instanceof ConvexError
            ? msg
            : "La demande n'a pas abouti. Vérifiez vos informations et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
        <div aria-hidden className="flex size-14 items-center justify-center rounded-full bg-[#3a1a22]"><Check className="size-7 text-cta" strokeWidth={2.4} /></div>
        <h2 className="m-0 font-display text-2xl">Demande envoyée</h2>
        <p className="m-0 leading-relaxed text-soft">
          Votre accès admin est <strong className="text-ink">en attente de validation</strong> par le super admin. Vous pourrez vous connecter dès qu&apos;il l&apos;aura validé.
        </p>
        <Button asChild variant="secondary"><Link href="/admin/connexion">Connexion admin</Link></Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
        <Label>Nom complet<Input name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></Label>
        <Label>Email<Input name="email" type="email" required autoComplete="email" /></Label>
        <Label>Téléphone<Input name="phone" type="tel" required inputMode="tel" pattern={PHONE_PATTERN} title="+216 suivi de 8 chiffres" placeholder="+216 __ ___ ___" autoComplete="tel" /></Label>
        <Label>Mot de passe<PasswordInput name="password" required minLength={8} autoComplete="new-password" /></Label>
        <Label>Confirmer le mot de passe<PasswordInput name="passwordConfirm" required minLength={8} autoComplete="new-password" /></Label>
        {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Envoi…" : "Envoyer la demande"}</Button>
      </form>
      <p className="m-0 text-center">
        Déjà un compte ? <Link href="/admin/connexion" className="font-semibold text-red-text">Connexion admin</Link>
      </p>
    </>
  );
}
