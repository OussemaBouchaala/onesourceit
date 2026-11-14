import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-5 py-10 text-sm text-muted">
        <Logo size="sm" />
        <nav aria-label="Pied de page" className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/produits" className="text-ink">Nos produits</Link>
          <Link href="/inscription" className="text-ink">Créer un compte revendeur</Link>
          <Link href="/mentions-legales" className="text-ink">Mentions légales</Link>
          <Link href="/cgv" className="text-ink">CGV</Link>
          <Link href="/confidentialite" className="text-ink">Confidentialité</Link>
        </nav>
        <span>© {new Date().getFullYear()} ONEsource IT</span>
      </div>
    </footer>
  );
}
