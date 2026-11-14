import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };
export const dynamic = "force-dynamic";

// The proxy already sends signed-out visitors to /connexion. Here we check
// the admin role; every Convex admin function checks it again.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await fetchQuery(api.profiles.me, {}, { token: await convexAuthNextjsToken() });
  if (!me) redirect("/connexion");
  if (me.role !== "admin") redirect("/compte");
  return (
    <div className="flex min-h-dvh flex-wrap items-start">
      <AdminNav />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 p-4 sm:p-10">{children}</main>
    </div>
  );
}
