import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { CONTACT, whatsappLink } from "@/lib/format";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 text-sm text-muted md:grid-cols-[1.2fr_1fr] md:items-start">
        <div className="flex flex-col gap-4">
          <Logo size="sm" className="self-start" />
          <a href={CONTACT.phoneHref} className="flex items-center gap-2 text-[15px] text-ink no-underline"><Phone aria-hidden className="size-4 text-muted" />{CONTACT.phoneDisplay}</a>
          <span className="flex items-start gap-2 text-[15px] text-soft"><MapPin aria-hidden className="mt-0.5 size-4 flex-none" />{CONTACT.address}</span>
          <a
            href={whatsappLink("Bonjour ONEsource IT, j'ai une question.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-white px-5 font-semibold text-navy no-underline hover:bg-soft max-sm:self-stretch"
          >
            <MessageCircle aria-hidden className="size-4" />WhatsApp · {CONTACT.whatsappDisplay}
          </a>
        </div>
        <div className="flex flex-col gap-6">
          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px]">
            <Link href="/produits" className="flex min-h-11 items-center text-ink">Nos produits</Link>
            <Link href="/inscription" className="flex min-h-11 items-center text-ink">Devenir revendeur</Link>
            <Link href="/connexion" className="flex min-h-11 items-center text-ink">Se connecter</Link>
            <Link href="/panier" className="flex min-h-11 items-center text-ink">Mon panier</Link>
            <Link href="/mentions-legales" className="flex min-h-11 items-center text-soft">Mentions légales</Link>
            <Link href="/cgv" className="flex min-h-11 items-center text-soft">CGV</Link>
            <Link href="/confidentialite" className="flex min-h-11 items-center text-soft">Confidentialité</Link>
          </nav>
          <span>© {new Date().getFullYear()} ONEsource IT</span>
        </div>
      </div>
    </footer>
  );
}
