import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { AdminSignInForm, NotAdmin } from "@/components/auth/admin-sign-in-form";

export const metadata: Metadata = { title: "Connexion administration", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin-only sign-in, separate from the reseller one at /connexion.
// A signed-in admin goes straight to /admin; a signed-in reseller is told
// this space is not for them and can sign out.
export default async function AdminSignInPage() {
  const me = await fetchQuery(api.profiles.me, {}, { token: await convexAuthNextjsToken() });
  if (me?.role === "admin") redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center gap-7 px-4 py-12">
      <div className="flex flex-col gap-2.5">
        <p className="m-0 text-sm font-semibold tracking-wide text-red-text uppercase">ONEsource IT</p>
        <h1 className="m-0 font-display text-[clamp(30px,8vw,40px)] leading-none font-bold uppercase">
          Espace <em className="text-red-text">administration</em>
        </h1>
        <p className="m-0 text-soft">Réservé à l&apos;équipe ONEsource IT.</p>
      </div>
      {me ? <NotAdmin /> : <AdminSignInForm />}
    </main>
  );
}
