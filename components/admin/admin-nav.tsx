"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Truck,
  ArrowLeft, Boxes, Camera, CircleHelp, ClipboardList, LayoutDashboard, LogOut, Menu, Store, Tags, Upload, Users, X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";
import { openGuide } from "./guides";

function Count({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cn("inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-cta px-1.5 text-xs font-semibold text-white", className)}>
      {n}
    </span>
  );
}

/**
 * Phones: a top bar with the page name, "?" (page guide) and "Menu", which
 * opens a full-screen list of pages. Larger screens: a sidebar.
 */
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const stats = useQuery(api.admin.dashboard);
  const me = useQuery(api.profiles.me);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  const tabs = [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, badge: 0 },
    { href: "/admin/commandes", label: "Commandes", icon: ClipboardList, badge: stats?.newOrders ?? 0 },
    { href: "/admin/revendeurs", label: "Revendeurs", icon: Store, badge: stats?.pendingResellers ?? 0 },
    { href: "/admin/articles", label: "Articles", icon: Tags, badge: 0 },
    { href: "/admin/produits", label: "Produits & stock", icon: Boxes, badge: 0 },
    { href: "/admin/photos", label: "Photos", icon: Camera, badge: 0 },
    { href: "/admin/import", label: "Import en masse", icon: Upload, badge: 0 },
    { href: "/admin/livraison", label: "Livraison", icon: Truck, badge: 0 },
    ...(me?.isSuperAdmin ? [{ href: "/admin/equipe", label: "Équipe", icon: Users, badge: stats?.pendingAdmins ?? 0 }] : []),
  ];
  const isOn = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const current = tabs.find((t) => isOn(t.href));
  const waiting = tabs.reduce((n, t) => n + t.badge, 0);

  // Lock page scroll while the phone menu is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  async function logout() {
    await signOut();
    router.push("/admin/connexion");
    router.refresh();
  }

  const links = (big: boolean) => tabs.map((t) => {
    const on = isOn(t.href);
    const Icon = t.icon;
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl px-3 text-ink no-underline",
          big ? "min-h-[52px] text-[17px]" : "min-h-11 text-[15px]",
          on ? "bg-[#1e3350] font-semibold" : "hover:bg-card",
        )}
      >
        <span className="flex items-center gap-3"><Icon aria-hidden className="size-5 text-muted" />{t.label}</span>
        <Count n={t.badge} />
      </Link>
    );
  });

  const footer = (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <button type="button" onClick={openGuide} className="hidden min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] text-soft hover:bg-card md:flex">
        <CircleHelp aria-hidden className="size-5" />Aide sur cette page
      </button>
      <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-soft no-underline hover:bg-card">
        <ArrowLeft aria-hidden className="size-5" />Voir le site
      </Link>
      <button type="button" onClick={logout} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] text-red-text hover:bg-card">
        <LogOut aria-hidden className="size-5" />Se déconnecter
      </button>
    </div>
  );

  return (
    <>
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 border-b border-line bg-[#031726] py-2.5 pr-3 pl-4 md:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-red-text">ADMIN</span>
          <strong className="truncate font-display text-lg leading-tight">{current?.label ?? "Administration"}</strong>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={openGuide} aria-label="Aide sur cette page" className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong text-ink">
            <CircleHelp aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="admin-menu"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-navy"
          >
            <Menu aria-hidden className="size-5" />Menu<Count n={waiting} />
          </button>
        </div>
      </header>

      {open && (
        <div id="admin-menu" role="dialog" aria-modal="true" aria-label="Menu administration" className="fixed inset-0 z-40 flex flex-col gap-1 overflow-y-auto bg-[#031726] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:hidden">
          <div className="flex items-center justify-between pb-3">
            <Link href="/admin" className="no-underline"><Logo size="sm" /></Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <nav aria-label="Administration" className="flex flex-col gap-1">{links(true)}</nav>
          <div className="mt-auto pt-4">{footer}</div>
        </div>
      )}

      {/* Larger screens: sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-1.5 overflow-y-auto bg-[#031726] px-4 py-7 md:flex">
        <div className="flex flex-col gap-1.5 px-1 pb-6">
          <Link href="/admin" className="no-underline"><Logo size="sm" /></Link>
          <span className="text-xs font-semibold tracking-[0.14em] text-red-text">ADMIN</span>
        </div>
        <nav aria-label="Administration" className="flex flex-col gap-1">{links(false)}</nav>
        <div className="mt-auto pt-6">{footer}</div>
      </aside>
    </>
  );
}
