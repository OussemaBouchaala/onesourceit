import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function Page() {
  return (
    <LegalPage title="Conditions générales de vente" updated="15/11/2026">
      <LegalSection title="1. Objet">
        <p>
          Ces conditions s&apos;appliquent à toutes les commandes passées sur le site onesourceit.tn auprès de
          ONEsource IT, par des particuliers (vente au détail) ou par des revendeurs professionnels (vente en
          gros). Passer une commande vaut acceptation de ces conditions.
        </p>
      </LegalSection>
      <LegalSection title="2. Comptes revendeurs">
        <p>
          Le prix revendeur est réservé aux professionnels dont le compte a été validé par ONEsource IT. La
          validation se fait après vérification des informations de la boutique ; elle peut être refusée ou
          retirée. Une commande au prix revendeur porte sur au moins 10 pièces par modèle, puis par multiples
          de 5.
        </p>
      </LegalSection>
      <LegalSection title="3. Prix">
        <p>
          Les prix sont indiqués en dinars tunisiens (DT), toutes taxes comprises. Les frais de livraison à
          domicile sont affichés avant la validation de la commande ; le retrait au magasin à Sfax est
          gratuit. Le prix appliqué est celui en vigueur au moment de la commande, recalculé par nos serveurs.
        </p>
      </LegalSection>
      <LegalSection title="4. Commande">
        <p>
          La commande est enregistrée dès sa validation sur le site. ONEsource IT la confirme ensuite par
          téléphone ou par WhatsApp. En cas de rupture de stock d&apos;un article, le client est prévenu et peut
          choisir un remplacement ou l&apos;annulation de cet article.
        </p>
      </LegalSection>
      <LegalSection title="5. Paiement">
        <p>
          Le paiement se fait uniquement à la livraison, en espèces au livreur, ou au magasin lors du retrait.
          Aucun paiement en ligne n&apos;est demandé sur le site.
        </p>
      </LegalSection>
      <LegalSection title="6. Livraison et retrait">
        <ul>
          <li>Livraison à domicile partout en Tunisie, en général sous 2 à 5 jours ouvrables après confirmation.</li>
          <li>Retrait gratuit au magasin de Sfax dès que la commande est prête ; le client est prévenu.</li>
          <li>Le client vérifie le colis à la réception et signale tout dommage au livreur et à ONEsource IT le jour même.</li>
        </ul>
      </LegalSection>
      <LegalSection title="7. Retours et rétractation">
        <p>
          Un particulier peut retourner un article dans les 10 jours ouvrables suivant sa réception, dans son
          emballage d&apos;origine et sans trace d&apos;utilisation, conformément à la loi n° 2000-83 relative au
          commerce électronique. Le remboursement intervient dans les 10 jours suivant le retour ; les frais de
          retour restent à la charge du client sauf article défectueux ou erroné.
        </p>
        <p>
          Pour les revendeurs, seuls les articles défectueux ou ne correspondant pas à la commande sont repris
          ou échangés, s&apos;ils sont signalés dans les 7 jours suivant la réception.
        </p>
      </LegalSection>
      <LegalSection title="8. Garantie">
        <p>
          Les articles bénéficient de la garantie légale contre les défauts de fabrication. Elle ne couvre pas
          l&apos;usure normale, les chocs ou une mauvaise utilisation.
        </p>
      </LegalSection>
      <LegalSection title="9. Litiges">
        <p>
          En cas de réclamation, contactez-nous d&apos;abord par WhatsApp, téléphone ou email : nous cherchons
          une solution amiable. À défaut, le droit tunisien s&apos;applique et les tribunaux de Sfax sont compétents.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
