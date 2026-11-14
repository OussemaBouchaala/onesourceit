"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

/** Shown on /admin/connexion to a signed-in account that isn't an admin. */
export function NotAdmin({ email }: { email: string }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
      <p className="m-0">
        Le compte <strong>{email}</strong> n&apos;a pas accès à l&apos;administration.
      </p>
      <Button
        variant="secondary"
        size="lg"
        onClick={async () => {
          await signOut();
          router.refresh();
        }}
      >
        Changer de compte
      </Button>
      <Link href="/compte" className="text-center text-sm text-red-text">Aller à mon espace revendeur</Link>
    </div>
  );
}
