"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function AdminSignInForm() {
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
      // The page re-checks the role on the server: admins land on /admin,
      // anyone else sees the "not an admin" notice.
      router.refresh();
    } catch {
      setError("Email ou mot de passe incorrect.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
      <Label>Email<Input name="email" type="email" required autoComplete="username" /></Label>
      <Label>Mot de passe<PasswordInput name="password" required autoComplete="current-password" /></Label>
      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
      <Button type="submit" variant="secondary" size="lg" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</Button>
    </form>
  );
}

export function NotAdmin() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
      <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">
        Ce compte n&apos;a pas accès à l&apos;administration.
      </p>
      <Button
        variant="secondary"
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
          router.refresh();
        }}
      >
        Se déconnecter
      </Button>
      <Link href="/compte" className="text-center font-semibold text-red-text">Aller à mon espace revendeur</Link>
    </div>
  );
}
