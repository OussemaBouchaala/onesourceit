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

/** Tunisian mobile/landline: +216 followed by 8 digits (spaces allowed). */
export function normalizeTnPhone(input: string): string | null {
  const digits = input.replace(/[\s.-]/g, "");
  const m = digits.match(/^(?:\+216|00216|216)?(\d{8})$/);
  return m ? `+216${m[1]}` : null;
}
