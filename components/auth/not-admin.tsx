"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
  /** "pending"/"refused" for an admin account not (or no longer) approved. */
  adminStatus?: "pending" | "refused";
  reason?: string | null;
};

/** Shown on /admin/connexion to a signed-in account without admin access. */
export function NotAdmin({ email, adminStatus, reason }: Props) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,32px)]">
      {adminStatus === "pending" ? (
        <p className="m-0 rounded-[14px] border border-[#f3c98b] bg-warn-soft p-4 leading-normal text-warn-ink">
          <strong>Demande en attente.</strong> Le compte <strong>{email}</strong> n&apos;est pas encore validé par le super admin. Réessayez après sa validation.
        </p>
      ) : adminStatus === "refused" ? (
        <p className="m-0 rounded-[14px] bg-bad-soft p-4 leading-normal text-bad-ink">
          <strong>Accès admin refusé.</strong>{reason ? ` Motif : ${reason}` : ""}
        </p>
      ) : (
        <p className="m-0">
          Le compte <strong>{email}</strong> n&apos;a pas accès à l&apos;administration.
        </p>
      )}
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
      {!adminStatus && <Link href="/compte" className="text-center text-sm text-red-text">Aller à mon espace revendeur</Link>}
    </div>
  );
}
