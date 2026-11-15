import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/legal-page";
import { CONTACT } from "@/lib/format";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updated="15/11/2026">
      <LegalSection title="Données collectées">
        <p>Nous collectons uniquement les données nécessaires pour traiter vos commandes :</p>
        <ul>
          <li>nom, téléphone, email et adresse de livraison ;</li>
          <li>pour les revendeurs : nom de la boutique, adresse et informations professionnelles ;</li>
          <li>le contenu et l&apos;historique de vos commandes.</li>
        </ul>
        <p>Aucune donnée bancaire n&apos;est demandée : le paiement se fait à la livraison.</p>
      </LegalSection>
      <LegalSection title="Utilisation">
        <p>
          Ces données servent à confirmer, préparer et livrer vos commandes, à valider les comptes revendeurs
          et à vous contacter au sujet de vos commandes. Elles ne sont ni vendues ni cédées. Elles sont
          transmises au transporteur uniquement pour la livraison.
        </p>
      </LegalSection>
      <LegalSection title="Hébergement et sécurité">
        <p>
          Les données sont hébergées par nos prestataires techniques (Vercel, Convex, Cloudinary). Les mots de
          passe sont chiffrés et l&apos;accès à l&apos;administration est réservé à l&apos;équipe de ONEsource IT.
        </p>
      </LegalSection>
      <LegalSection title="Durée de conservation">
        <p>
          Les données de compte sont conservées tant que le compte est actif. Les données de commande sont
          conservées pendant la durée exigée par les obligations comptables et fiscales.
        </p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>
          Le site utilise uniquement les cookies et le stockage local nécessaires à son fonctionnement :
          connexion à votre compte et contenu du panier. Aucun cookie publicitaire n&apos;est utilisé.
        </p>
      </LegalSection>
      <LegalSection title="Vos droits">
        <p>
          Conformément à la loi organique n° 2004-63 relative à la protection des données à caractère
          personnel, vous pouvez accéder à vos données, les faire corriger ou demander leur suppression en
          écrivant à <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
