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
 * Tunisian number: 8 digits starting with 2, 4, 5, 7 or 9, with an optional
 * +216 / 00216 prefix (spaces, dots and dashes allowed). Stored as +216XXXXXXXX.
 */
export function normalizeTnPhone(input: string): string | null {
  const digits = input.replace(/[\s.-]/g, "");
  const m = digits.match(/^(?:\+216|00216|216)?([24579]\d{7})$/);
  return m ? `+216${m[1]}` : null;
}

/** Same rule for the browser's pattern attribute. */
export const PHONE_PATTERN = "^(\\+?216|00216)?[\\s.\\-]*[24579]([\\s.\\-]*\\d){7}[\\s.\\-]*$";
export const PHONE_HINT = "8 chiffres commençant par 2, 4, 5, 7 ou 9";

// ---------- Order lifecycle (cash on delivery) ----------
// Stored names stay short and stable; labels live in lib/format.ts.
//   new        → À confirmer (call / WhatsApp the customer)
//   confirmed  → Confirmée (ready to pack)
//   ready      → Prête au retrait (store pickup only)
//   shipped    → Expédiée (handed to the courier)
//   delivered  → Livrée (courier collected the cash)
//   settled    → Encaissée (cash is with the shop)
//   returned   → Retournée (refused / unreachable, stock back)
//   cancelled  → Annulée (before dispatch, stock back)
export const ORDER_STATUSES = [
  "new", "confirmed", "ready", "shipped", "delivered", "settled", "returned", "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses where the order's pieces are back on the shelf. */
export const RESTOCKED: readonly OrderStatus[] = ["returned", "cancelled"];

/** Allowed next statuses. Pickup orders never go through the courier. */
export function nextStatuses(from: OrderStatus, ship: "home" | "pickup"): OrderStatus[] {
  switch (from) {
    case "new": return ["confirmed", "cancelled"];
    case "confirmed": return ship === "home" ? ["shipped", "cancelled"] : ["ready", "cancelled"];
    case "ready": return ["settled", "cancelled"];
    case "shipped": return ["delivered", "returned"];
    case "delivered": return ["settled"];
    case "cancelled": return ["new"]; // reopen by mistake
    default: return [];
  }
}

/** Delivery fee for a cart. Free from the threshold, retail orders only. */
export function deliveryFeeFor(opts: {
  ship: "home" | "pickup";
  subtotal: number;
  wholesale: boolean;
  fee: number | null;
  freeFrom: number | null;
}): number | null {
  if (opts.ship === "pickup") return 0;
  if (opts.fee === null) return null;
  if (!opts.wholesale && opts.freeFrom !== null && opts.subtotal >= opts.freeFrom) return 0;
  return opts.fee;
}
