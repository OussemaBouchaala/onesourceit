/** Step-by-step help shown on each admin page, in plain French for a non-technical admin. */
export type GuideStep = { icon: string; title: string; text: string };

export const GUIDES: Record<string, GuideStep[]> = {
  "/admin": [
    { icon: "👋", title: "Bienvenue dans l'espace admin", text: "Ce petit guide explique chaque page en quelques étapes. Le bouton « ? » en haut le rouvre à tout moment." },
    { icon: "✅", title: "Commencez par « À faire »", text: "Les cartes en rouge sont les tâches qui attendent : nouvelles commandes, revendeurs à valider. Touchez une carte pour y aller." },
    { icon: "☰", title: "Le menu", text: "Toutes les pages sont dans le menu. Un chiffre rouge indique ce qui attend votre action." },
    { icon: "📷", title: "Photos et stock", text: "« Photos » vous guide pour photographier chaque couleur. « Produits & stock » sert aux prix et aux quantités." },
  ],
  "/admin/commandes": [
    { icon: "🧾", title: "Vos commandes", text: "Chaque commande passée sur le site arrive ici. Le client paie à la livraison, en espèces." },
    { icon: "📞", title: "Confirmez par téléphone", text: "Touchez le numéro pour appeler le client. Une fois d'accord, changez le statut en « Confirmée »." },
    { icon: "🚚", title: "Suivez la livraison", text: "Passez ensuite à « Expédiée », puis « Livrée ». Si la commande est annulée, le stock est remis automatiquement." },
    { icon: "🔎", title: "Voir le détail", text: "Touchez le numéro de commande pour voir les articles, l'adresse et la note du client." },
  ],
  "/admin/revendeurs": [
    { icon: "🏪", title: "Les revendeurs", text: "Les boutiques qui créent un compte arrivent ici « en attente ». Elles voient seulement le prix détail." },
    { icon: "☎️", title: "Vérifiez la boutique", text: "Appelez ou écrivez sur WhatsApp, vérifiez le matricule fiscal et l'adresse." },
    { icon: "✅", title: "Valider ou refuser", text: "« Valider » débloque le prix de gros pour cette boutique. « Refuser » permet d'écrire un motif, qu'elle verra." },
  ],
  "/admin/produits": [
    { icon: "📦", title: "Produits & stock", text: "Choisissez d'abord le produit en haut. Tout ce qui suit concerne ce produit." },
    { icon: "💰", title: "Les prix", text: "Écrivez le prix détail et le prix de gros, par exemple 20,000. Un prix vide s'affiche « [XX] DT » sur le site." },
    { icon: "🔢", title: "Le stock", text: "Chaque ligne est un modèle dans une couleur. Changez la quantité quand la marchandise arrive. Les commandes la baissent toutes seules." },
    { icon: "👁️", title: "En vente ou masqué", text: "Décochez « En vente » pour cacher une couleur du site sans la supprimer." },
    { icon: "➕", title: "Ajouter", text: "En bas : ajoutez un modèle de téléphone, une couleur, puis la combinaison modèle + couleur avec son stock." },
  ],
  "/admin/photos": [
    { icon: "📷", title: "L'assistant photos", text: "Choisissez l'article, puis prenez une photo par couleur. Elle est rangée automatiquement, sans renommer de fichier." },
    { icon: "☀️", title: "Bien photographier", text: "Fond clair uni, lumière du jour, produit au centre, même cadrage pour toutes les couleurs." },
    { icon: "✅", title: "Vérifiez", text: "La face est obligatoire. Une couleur en rouge n'a pas encore sa photo de face." },
  ],
  "/admin/import": [
    { icon: "⬆️", title: "Import en masse", text: "Pour ajouter beaucoup de choses d'un coup. Pour une seule photo ou un seul prix, utilisez plutôt « Photos » ou « Produits & stock »." },
    { icon: "📄", title: "Catalogue CSV", text: "Téléchargez le modèle, remplissez une ligne par modèle et couleur dans Excel, puis importez le fichier." },
    { icon: "👀", title: "Rien n'est enregistré sans vous", text: "Un aperçu montre chaque ligne (nouvelle, mise à jour, erreur). Vous confirmez ensuite l'import." },
  ],
  "/admin/equipe": [
    { icon: "👥", title: "L'équipe admin", text: "Les personnes qui demandent un accès admin arrivent ici. Elles n'ont aucun accès avant votre validation." },
    { icon: "✅", title: "Valider, refuser, retirer", text: "« Valider » donne l'accès. « Retirer l'accès » le coupe tout de suite. Vous seul voyez cette page." },
  ],
};

export function guideFor(pathname: string) {
  const key = Object.keys(GUIDES)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return key ? { key, steps: GUIDES[key] } : null;
}

export const OPEN_GUIDE_EVENT = "admin-guide:open";
export const openGuide = () => window.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
