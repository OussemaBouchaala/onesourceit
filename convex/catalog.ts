import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getViewer, wholesalePriceFor, getSetting, variantLabel, photoUrl } from "./lib";

/** Brands with their model count, for the homepage. */
export const brands = query({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").withIndex("by_sort").collect();
    return Promise.all(
      brands.map(async (b) => {
        const models = await ctx.db
          .query("models")
          .withIndex("by_brand", (q) => q.eq("brandId", b._id))
          .collect();
        return { _id: b._id, name: b.name, modelCount: models.length };
      }),
    );
  },
});

/**
 * Everything the configurator needs. wholesalePrice is null for anyone
 * who isn't an approved reseller (or admin): the value is never sent.
 * Stock counts are not sent either, only availability.
 */
export const productPage = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!product || !product.isActive) return null;
    const viewer = await getViewer(ctx);

    const variants = (
      await ctx.db
        .query("variants")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect()
    ).filter((x) => x.isActive && x.stock > 0);

    const modelIds = new Set(variants.map((x) => x.modelId));
    const colorIds = new Set(variants.map((x) => x.colorId));
    const models = (await Promise.all([...modelIds].map((id) => ctx.db.get(id)))).filter(
      (m) => m !== null,
    );
    const brandIds = new Set(models.map((m) => m.brandId));
    const brands = (await Promise.all([...brandIds].map((id) => ctx.db.get(id)))).filter(
      (b) => b !== null,
    );
    const colors = (await Promise.all([...colorIds].map((id) => ctx.db.get(id)))).filter(
      (c) => c !== null,
    );

    return {
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
        retailPrice: product.retailPrice,
      },
      wholesalePrice: await wholesalePriceFor(ctx, viewer, product._id),
      viewer: {
        signedIn: !!viewer.profile,
        status: viewer.profile?.status ?? null,
        isApproved: viewer.isApproved,
      },
      brands: brands
        .sort((a, b) => a.sort - b.sort)
        .map((b) => ({ _id: b._id, name: b.name })),
      models: models
        .sort((a, b) => a.sort - b.sort)
        .map((m) => ({ _id: m._id, brandId: m.brandId, name: m.name })),
      colors: colors
        .sort((a, b) => a.sort - b.sort)
        .map((c) => ({ _id: c._id, name: c.name, hex: c.hex })),
      variants: variants.map((x) => ({
        _id: x._id,
        modelId: x.modelId,
        colorId: x.colorId,
      })),
    };
  },
});

/**
 * Prices the cart lines for the current viewer. The cart in the browser
 * only holds variant ids and quantities; prices always come from here.
 */
export const priceCart = query({
  args: { variantIds: v.array(v.id("variants")) },
  handler: async (ctx, { variantIds }) => {
    const viewer = await getViewer(ctx);
    const deliveryFee = await getSetting(ctx, "deliveryFee");
    const freeDeliveryFrom = await getSetting(ctx, "freeDeliveryFrom");
    const lines = await Promise.all(
      variantIds.slice(0, 100).map(async (id) => {
        const variant = await ctx.db.get(id);
        if (!variant) return null;
        const product = await ctx.db.get(variant.productId);
        if (!product) return null;
        const { label, hex } = await variantLabel(ctx, variant);
        const unitPrice = viewer.isApproved
          ? await wholesalePriceFor(ctx, viewer, product._id)
          : product.retailPrice;
        return {
          variantId: id,
          productName: product.name,
          label,
          hex,
          unitPrice,
          available: variant.isActive && product.isActive && variant.stock > 0,
        };
      }),
    );
    return {
      priceType: viewer.isApproved ? ("wholesale" as const) : ("retail" as const),
      deliveryFee,
      // Free delivery applies to retail orders only.
      freeDeliveryFrom: viewer.isApproved ? null : freeDeliveryFrom,
      lines: lines.filter((l) => l !== null),
    };
  },
});

/** Active products (one per quality / range) for /produits. */
export const products = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return Promise.all(
      rows.map(async (p) => {
        const cover = p.imageId
          ? await ctx.storage.getUrl(p.imageId)
          : await firstPhotoUrl(ctx, p._id);
        return {
          _id: p._id,
          name: p.name,
          slug: p.slug,
          retailPrice: p.retailPrice,
          imageUrl: cover,
        };
      }),
    );
  },
});

/**
 * Photos for one model + color of a product, in slot order (face, dos,
 * profil). Photos made for that exact model win; otherwise the article ×
 * color photos are shown for every model.
 */
export const variantPhotos = query({
  args: { productId: v.id("products"), modelId: v.id("models"), colorId: v.id("colors") },
  handler: async (ctx, { productId, modelId, colorId }) => {
    const all = await ctx.db
      .query("photos")
      .withIndex("by_product_color", (q) => q.eq("productId", productId).eq("colorId", colorId))
      .collect();
    const own = all.filter((p) => p.modelId === modelId);
    const rows = own.length > 0 ? own : all.filter((p) => p.modelId === undefined);
    const out = await Promise.all(
      rows.map(async (r) => ({
        _id: r._id,
        url: await photoUrl(ctx, r, 1200),
        thumbUrl: await photoUrl(ctx, r, 200),
      })),
    );
    return out.filter((r): r is { _id: typeof r._id; url: string; thumbUrl: string } => r.url !== null);
  },
});

async function firstPhotoUrl(ctx: QueryCtx, productId: Id<"products">) {
  const photo = await ctx.db
    .query("photos")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .first();
  return photo ? await photoUrl(ctx, photo, 600) : null;
}
