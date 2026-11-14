import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export type Viewer = {
  profile: Doc<"profiles"> | null;
  /** Approved admin (pending or refused admins have no access). */
  isAdmin: boolean;
  /** The approved admin who manages the admin team. */
  isSuperAdmin: boolean;
  /** Approved reseller: may see and pay wholesale prices. */
  isApproved: boolean;
};

export async function getViewer(ctx: QueryCtx): Promise<Viewer> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return { profile: null, isAdmin: false, isSuperAdmin: false, isApproved: false };
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const isAdmin = profile?.role === "admin" && profile.status === "approved";
  return {
    profile,
    isAdmin,
    isSuperAdmin: isAdmin && profile?.superAdmin === true,
    isApproved: !!profile && profile.role === "reseller" && profile.status === "approved",
  };
}

export async function requireAdmin(ctx: QueryCtx) {
  const viewer = await getViewer(ctx);
  if (!viewer.isAdmin) throw new ConvexError("Accès réservé à l'administration.");
  return viewer;
}

export async function requireSuperAdmin(ctx: QueryCtx) {
  const viewer = await getViewer(ctx);
  if (!viewer.isSuperAdmin) throw new ConvexError("Accès réservé au super admin.");
  return viewer;
}

/**
 * The only place that reads reseller_prices. Returns null unless the
 * caller is an approved reseller or an admin, so the real wholesale price
 * never leaves the server for anyone else.
 */
export async function wholesalePriceFor(
  ctx: QueryCtx,
  viewer: Viewer,
  productId: Id<"products">,
): Promise<number | null> {
  if (!viewer.isApproved && !viewer.isAdmin) return null;
  const row = await ctx.db
    .query("reseller_prices")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .unique();
  return row?.price ?? null;
}

export async function getSetting(ctx: QueryCtx, key: string) {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value ?? null;
}

export async function variantLabel(ctx: QueryCtx, v: Doc<"variants">) {
  const [model, color] = await Promise.all([ctx.db.get(v.modelId), ctx.db.get(v.colorId)]);
  const brand = model ? await ctx.db.get(model.brandId) : null;
  return {
    label: `${brand?.name ?? ""} ${model?.name ?? ""} · ${color?.name ?? ""}`.trim(),
    hex: color?.hex ?? "#888888",
  };
}

// ---------- Photos ----------

/** Cloudinary is used when its three env vars are set on the Convex deployment. */
export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Deterministic id, so re-importing the same file name replaces the photo. */
export function photoPublicId(productId: string, modelId: string | undefined, colorId: string, position: number) {
  return `onesourceit/${productId}/${modelId ?? "all"}_${colorId}_${position}`;
}

/**
 * URL of a resized copy. Cloudinary keeps the full-size original and serves
 * f_auto (WebP/AVIF) at the requested width, so phones get small files.
 */
export async function photoUrl(
  ctx: QueryCtx,
  photo: Pick<Doc<"photos">, "publicId" | "version" | "storageId">,
  width: number,
): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (photo.publicId && cloudName) {
    const version = photo.version ? `v${photo.version}/` : "";
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${version}${photo.publicId}`;
  }
  return photo.storageId ? await ctx.storage.getUrl(photo.storageId) : null;
}

/** Cloudinary request signature: SHA-1 of the sorted params + secret, hex. */
export async function cloudinarySignature(params: Record<string, string | number>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign + secret));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
