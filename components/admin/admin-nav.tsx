"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const stats = useQuery(api.admin.dashboard);
  const me = useQuery(api.profiles.me);
  const tabs = [
    { href: "/admin", label: "Tableau de bord", badge: 0 },
    { href: "/admin/commandes", label: "Commandes", badge: stats?.newOrders ?? 0 },
    { href: "/admin/revendeurs", label: "Revendeurs", badge: stats?.pendingResellers ?? 0 },
    { href: "/admin/produits", label: "Produits & stock", badge: 0 },
    { href: "/admin/photos", label: "Photos", badge: 0 },
    { href: "/admin/import", label: "Import", badge: 0 },
    ...(me?.isSuperAdmin ? [{ href: "/admin/equipe", label: "Équipe", badge: stats?.pendingAdmins ?? 0 }] : []),
  ];

  async function logout() {
    await signOut();
    router.push("/admin/connexion");
    router.refresh();
  }
  return (
    <nav
      aria-label="Administration"
      className="sticky top-0 z-20 flex max-w-full flex-[1_1_100%] flex-col gap-1.5 self-stretch bg-[#031726] px-4 py-3 md:static md:flex-[1_1_240px] md:px-5 md:py-7"
    >
      <div className="flex items-center justify-between pb-2.5 md:flex-col md:items-start md:gap-1.5 md:pb-6">
        <Link href="/admin" className="no-underline"><Logo size="sm" /></Link>
        <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-1.5">
          <span className="pl-3 text-xs font-semibold tracking-[0.14em] text-red-text">ADMIN</span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm text-[#b8c6d4] hover:bg-card hover:text-ink md:hidden"
          >
            <LogOut aria-hidden className="size-4" />Déconnexion
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1.5 md:overflow-visible">
        {tabs.map((t) => {
          const on = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-none items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[15px] whitespace-nowrap text-ink no-underline",
                on ? "bg-[#1e3350]" : "hover:bg-card",
              )}
            >
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-cta px-1.5 text-xs font-semibold text-white">{t.badge}</span>
              )}
            </Link>
          );
        })}
      </div>
      <Link href="/" className="hidden px-3 pt-6 text-sm text-[#b8c6d4] md:block">← Voir le site</Link>
      <button
        type="button"
        onClick={logout}
        className="hidden min-h-11 items-center gap-2 rounded-[10px] px-3 text-left text-sm text-[#b8c6d4] hover:bg-card hover:text-ink md:inline-flex"
      >
        <LogOut aria-hidden className="size-4" />Se déconnecter
      </button>
    </nav>
  );
}
