import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { AdminSignUpForm } from "@/components/auth/admin-sign-up-form";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = { title: "Administration · Demande d'accès", robots: { index: false } };
export const dynamic = "force-dynamic";

// Public page: anyone can ask, but the account has no access until the
// super admin approves it on /admin/equipe.
export default async function AdminSignUpPage() {
  if (await convexAuthNextjsToken()) redirect("/admin/connexion");
  return (
    <main className="flex min-h-dvh items-start justify-center bg-navy-deep px-4 pt-[clamp(40px,12vh,120px)] pb-12">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <Link href="/" aria-label="Retour au site" className="self-start"><Logo /></Link>
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-xs font-semibold tracking-[0.18em] text-red-text uppercase">Back-office</p>
          <h1 className="m-0 font-display text-[clamp(28px,7vw,36px)] leading-none font-bold uppercase">
            Demande d&apos;accès <em className="text-red-text">admin</em>
          </h1>
          <p className="m-0 text-soft">Le super admin doit valider votre compte avant la première connexion.</p>
        </div>
        <AdminSignUpForm />
      </div>
    </main>
  );
}
