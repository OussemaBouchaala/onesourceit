// Helpers for the admin bulk import (photos by file name, catalog CSV).

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export type ParsedName = { brand: string; model: string; color: string; position: number };

/**
 * "samsung_galaxy-a15_noir_1.jpg" → { brand: "samsung", model: "galaxy-a15", color: "noir", position: 1 }.
 * The trailing _N is optional (defaults to 1).
 */
export function parseFileName(fileName: string): ParsedName | null {
  const base = fileName.replace(/\.[^.]+$/, "");
  const parts = base.split("_").filter(Boolean);
  let position = 1;
  if (parts.length >= 4 && /^\d{1,2}$/.test(parts[parts.length - 1])) {
    position = Number(parts.pop());
  }
  if (parts.length < 3) return null;
  const brand = parts.shift()!;
  const color = parts.pop()!;
  return { brand, model: parts.join(" "), color, position };
}

type Named<T> = { _id: T; name: string };

export function matchName<
  B extends Named<string>,
  M extends Named<string> & { brandId: string },
  C extends Named<string>,
>(parsed: ParsedName, brands: B[], models: M[], colors: C[]) {
  const brand = brands.find((b) => norm(b.name) === norm(parsed.brand)) ?? null;
  const candidates = brand ? models.filter((m) => m.brandId === brand._id) : models;
  const want = norm(parsed.model);
  const model =
    candidates.find((m) => norm(m.name) === want) ??
    // "redmi_note13" should match the model "Redmi Note 13"
    candidates.find((m) => norm(m.name) === norm(parsed.brand) + want) ??
    null;
  const color = colors.find((c) => norm(c.name) === norm(parsed.color)) ?? null;
  return { brand, model, color };
}

/** Resizes to fit maxSize × maxSize and converts to WebP in the browser. */
export async function toWebp(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  // Old Safari can't encode WebP: fall back to JPEG.
  if (!blob || blob.type !== "image/webp") {
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!jpeg) throw new Error("Conversion impossible");
    return jpeg;
  }
  return blob;
}

/** Minimal CSV parser: ; or , separator (auto-detected), quoted fields. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = ["gamme", "marque", "modele", "couleur", "code_couleur", "prix_detail", "prix_gros", "stock"] as const;

export const CSV_TEMPLATE =
  "﻿" +
  CSV_COLUMNS.join(";") +
  "\nCoque silicone soft-touch;Samsung;Galaxy A16;Noir;#1A1A1A;20,000;;120\n";
