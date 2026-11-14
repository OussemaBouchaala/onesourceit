import { internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Demo data so the PoC isn't empty. Run once with:
 *   npx convex run seed:run
 * Brands and models come from the design canvas. Prices the client hasn't
 * confirmed are left null so the site shows "[XX] DT":
 *   - wholesale price: null (set it in /admin/produits)
 *   - delivery fee: null (set it in /admin/produits)
 * The retail price uses the 20,000 DT shown on the canvas; confirm it with
 * the client.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("products").first()) {
      throw new ConvexError("Déjà initialisé : la base contient des produits.");
    }
    const catalog: Record<string, string[]> = {
      Samsung: ["Galaxy A05", "Galaxy A15", "Galaxy A25", "Galaxy A35", "Galaxy A55"],
      Redmi: ["Redmi 13C", "Redmi 14C", "Redmi Note 13", "Redmi Note 13 Pro"],
      Infinix: ["Hot 40", "Hot 40i", "Smart 8", "Note 40"],
    };
    const palette = [
      { name: "Noir", hex: "#1A1A1A" },
      { name: "Blanc", hex: "#FFFFFF" },
      { name: "Vert menthe", hex: "#A8E6CF" },
      { name: "Rose", hex: "#F6C1CC" },
      { name: "Bleu ciel", hex: "#9CC3F5" },
    ];
    const productId = await ctx.db.insert("products", {
      name: "Coque silicone soft-touch",
      slug: "coque-silicone-soft-touch",
      description: "[DESCRIPTION PRODUIT — à fournir par le client]",
      retailPrice: 20000,
      isActive: true,
    });
    const colorIds = [];
    for (const [i, c] of palette.entries()) {
      colorIds.push(await ctx.db.insert("colors", { ...c, sort: i + 1 }));
    }
    let brandSort = 0;
    for (const [brand, models] of Object.entries(catalog)) {
      const brandId = await ctx.db.insert("brands", { name: brand, sort: ++brandSort });
      for (const [i, name] of models.entries()) {
        const modelId = await ctx.db.insert("models", { brandId, name, sort: i + 1 });
        for (const colorId of colorIds) {
          // Placeholder stock until the client sends real quantities.
          await ctx.db.insert("variants", { productId, modelId, colorId, stock: 100, isActive: true });
        }
      }
    }
    await ctx.db.insert("settings", { key: "deliveryFee", value: null });
    await ctx.db.insert("settings", { key: "orderSeq", value: 0 });
  },
});

/**
 * Makes an existing account the admin. Sign up on /inscription first, then:
 *   npx convex run seed:makeAdmin '{"email":"you@example.com"}'
 */
export const makeAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("email"), email.toLowerCase()))
      .unique();
    if (!profile) throw new ConvexError("Aucun compte avec cet email.");
    await ctx.db.patch(profile._id, { role: "admin", status: "approved" });
  },
});
