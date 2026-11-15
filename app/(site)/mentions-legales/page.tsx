import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { CONTACT } from "@/lib/format";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updated="15/11/2026">
      <LegalSection title="Éditeur du site">
        <p>
          Le site onesourceit.tn est édité par ONEsource IT, commerce de gros et de détail de téléphones et
          d&apos;accessoires, immatriculé au Registre national des entreprises (RNE) en Tunisie.
        </p>
        <ul>
          <li>Adresse : {CONTACT.address}, Tunisie</li>
          <li>Téléphone : {CONTACT.phoneDisplay}</li>
          <li>WhatsApp : {CONTACT.whatsappDisplay}</li>
          <li>Email : {CONTACT.email}</li>
        </ul>
        <p>Le directeur de la publication est le gérant de ONEsource IT.</p>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par Vercel Inc. (États-Unis, vercel.com). Les données de la boutique sont
          stockées chez Convex, Inc. (convex.dev) et les photos des produits chez Cloudinary Ltd. (cloudinary.com).
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          Les textes, photos, logos et la mise en page du site appartiennent à ONEsource IT ou sont utilisés
          avec l&apos;accord de leurs auteurs. Toute reproduction sans autorisation écrite est interdite. Les
          noms Samsung, Redmi, Infinix et les autres marques citées appartiennent à leurs propriétaires et
          servent uniquement à indiquer la compatibilité des produits.
        </p>
      </LegalSection>
      <LegalSection title="Responsabilité">
        <p>
          ONEsource IT veille à l&apos;exactitude des informations publiées, notamment les prix et le stock. Une
          erreur manifeste de prix ou de disponibilité peut être corrigée à tout moment ; le client est alors
          prévenu avant la confirmation de sa commande.
        </p>
      </LegalSection>
      <LegalSection title="Droit applicable">
        <p>Le site et ces mentions sont soumis au droit tunisien. Tout litige relève des tribunaux de Sfax.</p>
      </LegalSection>
    </LegalPage>
  );
}
