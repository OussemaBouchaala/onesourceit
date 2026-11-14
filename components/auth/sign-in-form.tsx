"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { whatsappLink } from "@/lib/format";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("flow", "signIn");
    setBusy(true);
    try {
      await signIn("password", form);
      router.push("/compte");
      router.refresh();
    } catch {
      setError("Email ou mot de passe incorrect.");
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
        <Label>Email<Input name="email" type="email" required autoComplete="username" /></Label>
        <Label>Mot de passe<PasswordInput name="password" required autoComplete="current-password" /></Label>
        <a href={whatsappLink("Bonjour, j'ai oublié le mot de passe de mon compte revendeur.")} target="_blank" rel="noopener noreferrer" className="self-end text-sm text-red-text">
          Mot de passe oublié ?
        </a>
        {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
        <Button type="submit" variant="secondary" size="lg" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</Button>
      </form>
      <p className="m-0 text-center">
        Pas encore de compte ? <Link href="/inscription" className="font-semibold text-red-text">Créer un compte revendeur</Link>
      </p>
    </>
  );
}
