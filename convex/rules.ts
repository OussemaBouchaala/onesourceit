// Business rules shared by the Convex functions and the Next.js UI.
export const WHOLESALE_MIN_QTY = 10;
export const WHOLESALE_STEP = 5;

export function isValidWholesaleQty(qty: number) {
  return (
    Number.isInteger(qty) &&
    qty >= WHOLESALE_MIN_QTY &&
    (qty - WHOLESALE_MIN_QTY) % WHOLESALE_STEP === 0
  );
}

export const MAX_RETAIL_QTY = 99;
export const MAX_WHOLESALE_QTY = 5000;

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba",
  "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana",
  "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;

export const ACTIVITY_TYPES = [
  "Boutique téléphonie",
  "Revendeur en ligne",
  "Grossiste",
  "Réparateur",
] as const;

/**
 * Tunisian phone: 8 digits starting with 2, 4, 5, 7 or 9 (mobiles and
 * landlines), with an optional +216 / 00216 / 216 prefix. Stored as
 * "+216XXXXXXXX" so tel: and WhatsApp links work as they are.
 */
export function normalizeTnPhone(input: string): string | null {
  const digits = input.replace(/[\s.()-]/g, "");
  const m = digits.match(/^(?:\+216|00216|216)?([24579]\d{7})$/);
  return m ? `+216${m[1]}` : null;
}

/** Same rule for the browser's pattern attribute. */
export const TN_PHONE_PATTERN = "^(\\+?216|00216)?[\\s.\\-]*[24579]([\\s.\\-]*\\d){7}$";

// ---------- Cash-on-delivery order lifecycle ----------

/**
 * new        En attente de confirmation (placed from the cart)
 * confirmed  Confirmée par téléphone / WhatsApp
 * ready      Prête au retrait (store pickup only)
 * shipped    Expédiée : remise au livreur avec un numéro de suivi
 * delivered  Livrée, argent encaissé par le livreur (ou au magasin)
 * settled    Encaissée : le livreur a reversé l'argent (livraison seulement)
 * returned   Retournée : refusée ou client injoignable, stock remis
 * cancelled  Annulée avant l'envoi, stock remis
 */
export const ORDER_STATUSES = [
  "new", "confirmed", "ready", "shipped", "delivered", "settled", "returned", "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ShippingMethod = "home" | "pickup";

const NEXT: Record<OrderStatus, Record<ShippingMethod, OrderStatus[]>> = {
  new: { home: ["confirmed", "cancelled"], pickup: ["confirmed", "cancelled"] },
  confirmed: { home: ["shipped", "cancelled"], pickup: ["ready", "cancelled"] },
  ready: { home: [], pickup: ["delivered", "cancelled"] },
  shipped: { home: ["delivered", "returned"], pickup: [] },
  delivered: { home: ["settled"], pickup: [] },
  settled: { home: [], pickup: [] },
  returned: { home: [], pickup: [] },
  cancelled: { home: [], pickup: [] },
};

export function nextStatuses(from: OrderStatus, method: ShippingMethod): OrderStatus[] {
  return NEXT[from][method];
}

/** Statuses that give the pieces back to the stock. */
export const RESTOCK_STATUSES: readonly OrderStatus[] = ["returned", "cancelled"];

/** Default home-delivery fee in millimes (7,000 DT) until the admin sets one. */
export const DEFAULT_DELIVERY_FEE = 7000;

/** Fee for a home delivery: free from the threshold up, when one is set. */
export function deliveryFeeFor(subtotal: number, fee: number, freeFrom: number | null): number {
  return freeFrom !== null && subtotal >= freeFrom ? 0 : fee;
}
