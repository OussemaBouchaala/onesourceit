"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/components/cart/cart-context";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/#entreprise", label: "L'entreprise" },
  { href: "/produits", label: "Nos produits" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const me = useQuery(api.profiles.me);
  const { count, ready } = useCart();

  const account =
    me === undefined || me === null
      ? { href: "/connexion", label: "Se connecter" }
      : me.isAdmin
        ? { href: "/admin", label: "Administration" }
        : { href: "/compte", label: "Mon compte" };
  const showSignup = me === null;

  const cartLink = (
    <Link
      href="/panier"
      aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
      className="relative inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong text-ink hover:text-red-text"
    >
      <ShoppingCart aria-hidden className="size-5" />
      {ready && count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-xs font-semibold text-white">
          {count > 999 ? "999+" : count}
        </span>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-navy">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <Link href="/" aria-label="ONEsource IT, accueil" className="no-underline">
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-[15px] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("no-underline hover:text-red-text", pathname === n.href && "font-semibold")}>
              {n.label}
            </Link>
          ))}
          <Link href={account.href} className="no-underline hover:text-red-text">
            {account.label}
          </Link>
          {cartLink}
          {showSignup && (
            <Link
              href="/inscription"
              className="inline-flex min-h-11 items-center rounded-full bg-cta px-5 font-semibold text-white no-underline hover:bg-cta-hover"
            >
              Devenir revendeur
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {cartLink}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Menu"}
            className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-card"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Menu mobile" className="flex flex-col border-t border-line px-5 pt-1 pb-5 text-[17px] md:hidden">
          {[...NAV, account].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-divider py-3.5 no-underline">
              {n.label}
            </Link>
          ))}
          {showSignup && (
            <Link
              href="/inscription"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full bg-cta px-5 py-3.5 text-center font-semibold text-white no-underline"
            >
              Devenir revendeur
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
