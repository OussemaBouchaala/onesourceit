import Link from "next/link";
import { Eyebrow } from "@/components/site/eyebrow";
import { BrandGrid } from "@/components/site/brand-grid";
import { Button } from "@/components/ui/button";
import { CONTACT, whatsappLink } from "@/lib/format";

const H2 = "m-0 font-display text-[clamp(32px,8vw,48px)] leading-none font-bold uppercase";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-5 pt-[clamp(36px,8vw,96px)] pb-[clamp(48px,8vw,80px)]">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
          <Eyebrow>Grossiste téléphones &amp; accessoires · Sfax</Eyebrow>
          <h1 className="m-0 font-display text-[clamp(46px,12vw,84px)] leading-[0.95] font-bold tracking-[-0.02em] uppercase">
            Le mobile,
            <br />
            <em className="text-red-text">en gros.</em>
          </h1>
          <p className="m-0 max-w-[520px] text-[19px] leading-relaxed text-soft">
            Coques, protections et accessoires pour Samsung, Redmi et Infinix. Créez votre compte
            revendeur et accédez aux prix professionnels.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link href="/produits">Voir le catalogue</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/inscription">Créer un compte revendeur</Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden
          className="flex h-[clamp(280px,60vw,460px)] min-w-0 flex-[1_1_420px] items-center justify-center gap-[18px] overflow-hidden rounded-[28px] bg-card"
        >
          <div className="relative h-[250px] w-[120px] translate-y-4 -rotate-[8deg] rounded-[30px] bg-[#a8e6cf]">
            <div className="absolute top-4 left-4 h-[54px] w-11 rounded-[14px] bg-black/10" />
          </div>
          <div className="relative h-[290px] w-[140px] rounded-[34px] bg-[#1a1a1a]">
            <div className="absolute top-[18px] left-[18px] h-[62px] w-[50px] rounded-2xl bg-white/15" />
          </div>
          <div className="relative h-[250px] w-[120px] translate-y-4 rotate-[8deg] rounded-[30px] bg-[#f6c1cc]">
            <div className="absolute top-4 left-4 h-[54px] w-11 rounded-[14px] bg-black/10" />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8 px-6 py-9">
          {[
            ["Stock à Sfax", "Retrait gratuit sur place ou livraison partout en Tunisie."],
            ["Prix en gros", "Débloqués dès que votre compte revendeur est validé."],
            ["Paiement à la livraison", "En espèces au livreur ou au magasin."],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1.5">
              <strong className="font-display text-xl">{t}</strong>
              <span className="text-[15px] text-muted">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-[clamp(56px,10vw,96px)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Nos marques</Eyebrow>
            <h2 className={H2}>
              Coques <em className="text-red-text">silicone</em>
            </h2>
          </div>
          <Link href="/produits" className="font-semibold">
            Configurer ma sélection →
          </Link>
        </div>
        <BrandGrid />
      </section>

      <section className="bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-5 py-[clamp(56px,10vw,96px)]">
          <h2 className={H2}>
            Comment ça <em className="text-red-text">marche</em>
          </h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-8 p-0">
            {[
              ["01", "Créez votre compte", "Renseignez votre boutique, votre matricule fiscal et vos coordonnées."],
              ["02", "Validation par notre équipe", "Nous vérifions votre demande et activons votre accès revendeur."],
              ["03", "Commandez", "Choisissez marque, modèle et couleurs, puis validez votre panier. Paiement à la livraison."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex flex-col gap-3 border-t border-soft pt-6">
                <span className="font-display text-[40px] text-red-text">{n}</span>
                <strong className="text-xl">{t}</strong>
                <span className="text-[15px] leading-normal text-[#b8c6d4]">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="entreprise" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-wrap gap-12 px-5 py-[clamp(56px,10vw,96px)]">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <Eyebrow>L&apos;entreprise</Eyebrow>
          <h2 className={H2}>
            Ancrés à <em className="text-red-text">Sfax</em>
          </h2>
          <p className="m-0 text-[17px] leading-relaxed text-soft">
            [PRÉSENTATION DE L&apos;ENTREPRISE — 2 à 3 phrases fournies par le client.]
          </p>
        </div>
        <address className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] rounded-3xl border border-line bg-card p-[clamp(20px,5vw,32px)] text-base not-italic">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] tracking-[0.1em] text-muted uppercase">Adresse</span>
            <span>{CONTACT.address}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] tracking-[0.1em] text-muted uppercase">Téléphone</span>
            <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] tracking-[0.1em] text-muted uppercase">WhatsApp</span>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">{CONTACT.whatsappDisplay}</a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] tracking-[0.1em] text-muted uppercase">Email</span>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
          <Button asChild variant="secondary">
            <a href={whatsappLink("Bonjour ONEsource IT,")} target="_blank" rel="noopener noreferrer">
              Nous écrire sur WhatsApp
            </a>
          </Button>
          <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-line-strong text-center text-sm text-muted">
            [CARTE — lien Google Maps fourni par le client]
          </div>
        </address>
      </section>
    </main>
  );
}
