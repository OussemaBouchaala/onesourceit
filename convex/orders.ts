import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getViewer, wholesalePriceFor, getSetting, variantLabel } from "./lib";
import { shippingMethod } from "./schema";
import {
  GOVERNORATES,
  MAX_RETAIL_QTY,
  MAX_WHOLESALE_QTY,
  isValidWholesaleQty,
  normalizeTnPhone,
  WHOLESALE_MIN_QTY,
  WHOLESALE_STEP,
} from "./rules";

/**
 * Places a cash-on-delivery order. The browser only sends variant ids,
 * quantities and delivery details. Every price is read from the database
 * here; the wholesale price is used only for an approved reseller.
 */
export const placeOrder = mutation({
  args: {
    items: v.array(v.object({ variantId: v.id("variants"), qty: v.number() })),
    shippingMethod,
    customerName: v.string(),
    phone: v.string(),
    governorate: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const wholesale = viewer.isApproved;

    if (args.items.length === 0) throw new ConvexError("Votre panier est vide.");
    if (args.items.length > 50) throw new ConvexError("Trop de lignes dans le panier.");

    const customerName = args.customerName.trim();
    if (customerName.length < 2 || customerName.length > 120)
      throw new ConvexError("Indiquez votre nom et prénom.");
    const phone = normalizeTnPhone(args.phone);
    if (!phone) throw new ConvexError("Téléphone invalide (format +216 suivi de 8 chiffres).");

    let governorate: string | undefined;
    let city: string | undefined;
    let address: string | undefined;
    if (args.shippingMethod === "home") {
      governorate = args.governorate?.trim();
      city = args.city?.trim();
      address = args.address?.trim();
      if (!governorate || !(GOVERNORATES as readonly string[]).includes(governorate))
        throw new ConvexError("Choisissez un gouvernorat.");
      if (!city || city.length > 80) throw new ConvexError("Indiquez votre ville.");
      if (!address || address.length < 4 || address.length > 200)
        throw new ConvexError("Indiquez votre adresse complète.");
    }
    const note = args.note?.trim().slice(0, 500) || undefined;

    // Merge duplicate lines, then price each one from the database.
    const merged = new Map<string, { variantId: (typeof args.items)[number]["variantId"]; qty: number }>();
    for (const it of args.items) {
      const prev = merged.get(it.variantId);
      merged.set(it.variantId, { variantId: it.variantId, qty: (prev?.qty ?? 0) + it.qty });
    }

    const priced = [];
    for (const { variantId, qty } of merged.values()) {
      const variant = await ctx.db.get(variantId);
      const product = variant ? await ctx.db.get(variant.productId) : null;
      if (!variant || !product || !variant.isActive || !product.isActive)
        throw new ConvexError("Un article de votre panier n'est plus disponible.");
      const { label } = await variantLabel(ctx, variant);

      if (!Number.isInteger(qty) || qty < 1)
        throw new ConvexError(`Quantité invalide pour ${label}.`);
      if (wholesale && !isValidWholesaleQty(qty))
        throw new ConvexError(
          `${label} : minimum ${WHOLESALE_MIN_QTY} pièces, par multiples de ${WHOLESALE_STEP}.`,
        );
      if (qty > (wholesale ? MAX_WHOLESALE_QTY : MAX_RETAIL_QTY))
        throw new ConvexError(`Quantité trop élevée pour ${label}.`);
      if (variant.stock < qty)
        throw new ConvexError(`Stock insuffisant pour ${label} (${variant.stock} disponible(s)).`);

      const unitPrice = wholesale
        ? await wholesalePriceFor(ctx, viewer, product._id)
        : product.retailPrice;
      if (unitPrice === null)
        throw new ConvexError(`Le prix de ${product.name} n'est pas encore défini.`);

      priced.push({ variant, label, qty, unitPrice });
    }

    let shippingFee = 0;
    if (args.shippingMethod === "home") {
      const fee = await getSetting(ctx, "deliveryFee");
      if (fee === null)
        throw new ConvexError("Les frais de livraison ne sont pas encore définis. Choisissez le retrait à Sfax.");
      shippingFee = fee;
    }

    const subtotal = priced.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const itemCount = priced.reduce((sum, l) => sum + l.qty, 0);

    // Sequential human reference: OS-0001, OS-0002…
    const counter = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "orderSeq"))
      .unique();
    const seq = (counter?.value ?? 0) + 1;
    if (counter) await ctx.db.patch(counter._id, { value: seq });
    else await ctx.db.insert("settings", { key: "orderSeq", value: seq });
    const ref = `OS-${String(seq).padStart(4, "0")}`;
    const publicId = crypto.randomUUID();

    const orderId = await ctx.db.insert("orders", {
      ref,
      publicId,
      profileId: viewer.profile?._id ?? null,
      priceType: wholesale ? "wholesale" : "retail",
      customerName,
      phone,
      governorate,
      city,
      address,
      shippingMethod: args.shippingMethod,
      shippingFee,
      subtotal,
      total: subtotal + shippingFee,
      itemCount,
      status: "new",
      note,
    });
    for (const l of priced) {
      await ctx.db.insert("order_items", {
        orderId,
        variantId: l.variant._id,
        label: l.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
      });
      await ctx.db.patch(l.variant._id, { stock: l.variant.stock - l.qty });
    }
    return { ref, publicId };
  },
});

/** Confirmation page. Looked up by the unguessable publicId only. */
export const byPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .unique();
    if (!order) return null;
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();
    return {
      ref: order.ref,
      status: order.status,
      priceType: order.priceType,
      shippingMethod: order.shippingMethod,
      shippingFee: order.shippingFee,
      subtotal: order.subtotal,
      total: order.total,
      createdAt: order._creationTime,
      items: items.map((i) => ({ label: i.label, qty: i.qty, unitPrice: i.unitPrice })),
    };
  },
});

/** The signed-in reseller's own orders, for /compte. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer.profile) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_profile", (q) => q.eq("profileId", viewer.profile!._id))
      .order("desc")
      .take(50);
    return orders.map((o) => ({
      publicId: o.publicId,
      ref: o.ref,
      status: o.status,
      total: o.total,
      itemCount: o.itemCount,
      createdAt: o._creationTime,
    }));
  },
});
