import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { SignInForm } from "@/components/auth/sign-in-form";
import { NotAdmin } from "@/components/auth/not-admin";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = { title: "Administration · Connexion", robots: { index: false } };
export const dynamic = "force-dynamic";

// Back-office login, separate from the reseller login at /connexion.
export default async function AdminSignInPage() {
  const token = await convexAuthNextjsToken();
  const me = token ? await fetchQuery(api.profiles.me, {}, { token }) : null;
  if (me?.isAdmin) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-start justify-center bg-navy-deep px-4 pt-[clamp(40px,12vh,120px)] pb-12">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <Link href="/" aria-label="Retour au site" className="self-start"><Logo /></Link>
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-xs font-semibold tracking-[0.18em] text-red-text uppercase">Back-office</p>
          <h1 className="m-0 font-display text-[clamp(32px,8vw,40px)] leading-none font-bold uppercase">
            <em className="text-red-text">Administration</em>
          </h1>
          <p className="m-0 text-soft">Accès réservé à l&apos;équipe ONEsource.IT.</p>
        </div>
        {me ? (
          <NotAdmin
            email={me.email}
            adminStatus={me.role === "admin" && me.status !== "approved" ? me.status : undefined}
            reason={me.refusalReason}
          />
        ) : (
          <>
            <SignInForm variant="admin" />
            <p className="m-0 text-center">
              Nouveau dans l&apos;équipe ? <Link href="/admin/inscription" className="font-semibold text-red-text">Demander un accès admin</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
