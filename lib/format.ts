/**
 * Prices are integers in millimes. 20000 → "20,000 DT".
 * null means the client hasn't provided the price yet → "[XX] DT".
 */
export function formatDT(millimes: number | null | undefined): string {
  if (millimes === null || millimes === undefined) return "[XX] DT";
  const dt = Math.floor(millimes / 1000);
  const mm = String(millimes % 1000).padStart(3, "0");
  const grouped = String(dt).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},${mm} DT`;
}

/** "20,5" or "20.500" typed in admin → 20500 millimes. Empty → null. */
export function parseDT(input: string): number | null | "invalid" {
  const s = input.trim().replace(/\s/g, "").replace(/DT$/i, "").replace(",", ".");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return "invalid";
  return Math.round(Number(s) * 1000);
}

export function toDTInput(millimes: number | null): string {
  if (millimes === null) return "";
  return (millimes / 1000).toFixed(3).replace(".", ",");
}

export function formatDate(ms: number) {
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(ms);
}

export const ORDER_STATUS_LABEL = {
  new: "Nouvelle",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
} as const;

export const PROFILE_STATUS_LABEL = {
  pending: "En attente",
  approved: "Validé",
  refused: "Refusé",
} as const;

export function whatsappLink(text?: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "21621050742";
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const CONTACT = {
  address: "Avenue des Martyrs, immeuble Ben Arab, Sfax Médina, 3000 Sfax",
  phoneDisplay: "+216 21 050 742",
  phoneHref: "tel:+21621050742",
  email: "contact@onesourceit.shop",
};
