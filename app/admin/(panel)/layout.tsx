import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageGuide } from "@/components/admin/page-guide";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };
export const dynamic = "force-dynamic";

// The proxy already sends signed-out visitors to /admin/connexion. Here we
// check the admin role; every Convex admin function checks it again.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await fetchQuery(api.profiles.me, {}, { token: await convexAuthNextjsToken() });
  if (!me?.isAdmin) redirect("/admin/connexion");
  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:items-start">
      <AdminNav />
      <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-16 sm:px-8 md:py-10">{children}</main>
      <PageGuide />
    </div>
  );
}
