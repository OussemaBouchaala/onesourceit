import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export type Viewer = {
  profile: Doc<"profiles"> | null;
  isAdmin: boolean;
  /** Approved reseller: may see and pay wholesale prices. */
  isApproved: boolean;
};

export async function getViewer(ctx: QueryCtx): Promise<Viewer> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return { profile: null, isAdmin: false, isApproved: false };
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const isAdmin = profile?.role === "admin";
  return {
    profile,
    isAdmin,
    isApproved: !!profile && profile.role === "reseller" && profile.status === "approved",
  };
}

export async function requireAdmin(ctx: QueryCtx) {
  const viewer = await getViewer(ctx);
  if (!viewer.isAdmin) throw new ConvexError("Accès réservé à l'administration.");
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
