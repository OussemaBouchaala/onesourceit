import { action, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { orderStatus, priceType, profileStatus } from "./schema";
import { RESTOCK_STATUSES, nextStatuses, type OrderStatus } from "./rules";
import {
  cloudinaryConfig,
  cloudinarySignature,
  getDeliveryPricing,
  getSetting,
  getTextSetting,
  photoPublicId,
  photoUrl,
  requireAdmin,
  requireSuperAdmin,
  setSetting,
  variantLabel,
} from "./lib";

const ORDER_STATUS_FR: Record<OrderStatus, string> = {
  new: "En attente de confirmation",
  confirmed: "Confirmée",
  ready: "Prête au retrait",
  shipped: "Expédiée",
  delivered: "Livrée",
  settled: "Encaissée",
  returned: "Retournée",
  cancelled: "Annulée",
};

const price = v.union(v.number(), v.null());
function checkPrice(p: number | null) {
  if (p !== null && (!Number.isInteger(p) || p < 0 || p > 100_000_000))
    throw new ConvexError("Prix invalide.");
}

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireAdmin(ctx);
    const [newOrders, pending, approved] = await Promise.all([
      ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "new")).collect(),
      ctx.db.query("profiles").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("profiles").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
    ]);
    return {
      newOrders: newOrders.length,
      pendingResellers: pending.filter((p) => p.role === "reseller").length,
      approvedResellers: approved.filter((p) => p.role === "reseller").length,
      pendingAdmins: viewer.isSuperAdmin ? pending.filter((p) => p.role === "admin").length : 0,
      deliveryFee: (await getDeliveryPricing(ctx)).fee,
      toShip: (
        await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "confirmed")).collect()
      ).length,
    };
  },
});

// ---------- Orders ----------

export const orders = query({
  args: { status: v.optional(orderStatus), priceType: v.optional(priceType) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.status
      ? await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(200)
      : await ctx.db.query("orders").order("desc").take(200);
    const kept = rows.filter((o) => !args.priceType || o.priceType === args.priceType);
    const items = await Promise.all(
      kept.map((o) =>
        ctx.db.query("order_items").withIndex("by_order", (q) => q.eq("orderId", o._id)).collect(),
      ),
    );
    return kept
      .map((o, n) => ({
        _id: o._id,
        ref: o.ref,
        publicId: o.publicId,
        items: items[n].map((i) => ({ label: i.label, qty: i.qty, unitPrice: i.unitPrice })),
        createdAt: o._creationTime,
        customerName: o.customerName,
        phone: o.phone,
        governorate: o.governorate ?? null,
        city: o.city ?? null,
        address: o.address ?? null,
        note: o.note ?? null,
        priceType: o.priceType,
        itemCount: o.itemCount,
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        total: o.total,
        codAmount: o.codAmount ?? o.total,
        shippingMethod: o.shippingMethod,
        status: o.status,
        courierName: o.courierName ?? null,
        trackingNumber: o.trackingNumber ?? null,
        confirmationNotes: o.confirmationNotes ?? null,
        cancelReason: o.cancelReason ?? null,
        next: nextStatuses(o.status, o.shippingMethod),
      }));
  },
});

export const orderItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    return items.map((i) => ({ label: i.label, qty: i.qty, unitPrice: i.unitPrice }));
  },
});

const clean = (s: string | undefined, max: number) => s?.trim().slice(0, max) || undefined;

/**
 * Moves an order one step along the COD lifecycle (rules.ts). Only the
 * allowed next steps are accepted. Cancelled and returned orders give
 * their pieces back to the stock; dispatch needs the courier and its
 * tracking number; a cancellation needs a reason.
 */
export const setOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatus,
    cancelReason: v.optional(v.string()),
    courierName: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    confirmationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Commande introuvable.");
    if (order.status === args.status) return;
    if (!nextStatuses(order.status, order.shippingMethod).includes(args.status))
      throw new ConvexError(
        `Impossible de passer de « ${ORDER_STATUS_FR[order.status]} » à « ${ORDER_STATUS_FR[args.status]} ».`,
      );

    const patch: Partial<Doc<"orders">> = { status: args.status };
    if (args.status === "cancelled") {
      const reason = clean(args.cancelReason, 300);
      if (!reason) throw new ConvexError("Indiquez le motif de l'annulation.");
      patch.cancelReason = reason;
    }
    if (args.status === "returned") patch.cancelReason = clean(args.cancelReason, 300);
    if (args.status === "confirmed") patch.confirmationNotes = clean(args.confirmationNotes, 500);
    if (args.status === "shipped") {
      const courierName = clean(args.courierName, 80);
      const trackingNumber = clean(args.trackingNumber, 80);
      if (!courierName) throw new ConvexError("Indiquez le livreur.");
      if (!trackingNumber) throw new ConvexError("Indiquez le numéro de suivi.");
      patch.courierName = courierName;
      patch.trackingNumber = trackingNumber;
    }

    if (RESTOCK_STATUSES.includes(args.status)) {
      const items = await ctx.db
        .query("order_items")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const i of items) {
        const variant = await ctx.db.get(i.variantId);
        if (variant) await ctx.db.patch(variant._id, { stock: variant.stock + i.qty });
      }
    }

    const timeline = order.timeline ?? [{ status: order.status, at: order._creationTime }];
    patch.timeline = [...timeline, { status: args.status, at: Date.now() }];
    await ctx.db.patch(order._id, patch);
  },
});

/**
 * Cash-on-delivery money: what the courier still holds (delivered, not
 * yet transferred), what has been transferred, and the return rate of
 * home deliveries that reached an end (delivered, settled or returned).
 */
export const codSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [delivered, settled, returned, shipped] = await Promise.all(
      (["delivered", "settled", "returned", "shipped"] as const).map((status) =>
        ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", status)).collect(),
      ),
    );
    const home = (rows: Doc<"orders">[]) => rows.filter((o) => o.shippingMethod === "home");
    const sum = (rows: Doc<"orders">[]) => rows.reduce((a, o) => a + (o.codAmount ?? o.total), 0);
    const ended = home(delivered).length + home(settled).length + home(returned).length;
    return {
      withCourier: sum(home(delivered)),
      withCourierCount: home(delivered).length,
      inTransit: sum(home(shipped)),
      inTransitCount: home(shipped).length,
      settled: sum(home(settled)),
      settledCount: home(settled).length,
      returnRate: ended === 0 ? null : home(returned).length / ended,
      returnedCount: home(returned).length,
    };
  },
});

/** Confirmed home deliveries, one row each, for the courier CSV. */
export const courierExport = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .order("asc")
      .collect();
    return Promise.all(
      rows
        .filter((o) => o.shippingMethod === "home")
        .map(async (o) => {
          const items = await ctx.db
            .query("order_items")
            .withIndex("by_order", (q) => q.eq("orderId", o._id))
            .collect();
          return {
            ref: o.ref,
            customerName: o.customerName,
            phone: o.phone,
            governorate: o.governorate ?? "",
            city: o.city ?? "",
            address: o.address ?? "",
            summary: items.map((i) => `${i.qty} x ${i.label}`).join(" | "),
            codAmount: o.codAmount ?? o.total,
          };
        }),
    );
  },
});

// ---------- Resellers ----------

export const resellers = query({
  args: { status: v.optional(profileStatus) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db.query("profiles").withIndex("by_status", (q) => q.eq("status", status)).order("desc").collect()
      : await ctx.db.query("profiles").order("desc").collect();
    return rows
      .filter((p) => p.role === "reseller")
      .map((p) => ({
        _id: p._id,
        createdAt: p._creationTime,
        status: p.status,
        refusalReason: p.refusalReason ?? null,
        shopName: p.shopName,
        activityType: p.activityType,
        taxId: p.taxId ?? null,
        rne: p.rne ?? null,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        whatsapp: p.whatsapp ?? null,
        governorate: p.governorate,
        city: p.city,
        address: p.address,
      }));
  },
});

export const setResellerStatus = mutation({
  args: {
    profileId: v.id("profiles"),
    status: profileStatus,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { profileId, status, reason }) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.role !== "reseller") throw new ConvexError("Revendeur introuvable.");
    await ctx.db.patch(profileId, {
      status,
      refusalReason: status === "refused" ? reason?.trim().slice(0, 300) || undefined : undefined,
    });
  },
});

// ---------- Admin team (super admin only) ----------

export const team = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const rows = await ctx.db.query("profiles").order("desc").collect();
    return rows
      .filter((p) => p.role === "admin")
      .map((p) => ({
        _id: p._id,
        createdAt: p._creationTime,
        status: p.status,
        superAdmin: p.superAdmin === true,
        refusalReason: p.refusalReason ?? null,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
      }));
  },
});

/** Approve, refuse or remove (status "refused") another admin. */
export const setAdminStatus = mutation({
  args: {
    profileId: v.id("profiles"),
    status: profileStatus,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { profileId, status, reason }) => {
    await requireSuperAdmin(ctx);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.role !== "admin") throw new ConvexError("Admin introuvable.");
    if (profile.superAdmin) throw new ConvexError("Le super admin ne peut pas être modifié.");
    await ctx.db.patch(profileId, {
      status,
      refusalReason: status === "refused" ? reason?.trim().slice(0, 300) || undefined : undefined,
    });
  },
});

// ---------- Products, stock and prices ----------

export const catalog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").collect();
    const brands = await ctx.db.query("brands").withIndex("by_sort").collect();
    const models = await ctx.db.query("models").collect();
    const colors = await ctx.db.query("colors").collect();
    return {
      brands: brands.map((b) => ({ _id: b._id, name: b.name })),
      models: models.map((m) => ({ _id: m._id, brandId: m.brandId, name: m.name, sort: m.sort })),
      colors: colors.sort((a, b) => a.sort - b.sort).map((c) => ({ _id: c._id, name: c.name, hex: c.hex })),
      products: await Promise.all(
        products.map(async (p) => {
          const wholesale = await ctx.db
            .query("reseller_prices")
            .withIndex("by_product", (q) => q.eq("productId", p._id))
            .unique();
          const variants = await ctx.db
            .query("variants")
            .withIndex("by_product", (q) => q.eq("productId", p._id))
            .collect();
          const photos = await ctx.db
            .query("photos")
            .withIndex("by_product", (q) => q.eq("productId", p._id))
            .collect();
          return {
            _id: p._id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            isActive: p.isActive,
            imageUrl: p.imageId ? await ctx.storage.getUrl(p.imageId) : null,
            retailPrice: p.retailPrice,
            wholesalePrice: wholesale?.price ?? null,
            variants: await Promise.all(
              variants.map(async (x) => ({
                _id: x._id,
                modelId: x.modelId,
                colorId: x.colorId,
                stock: x.stock,
                isActive: x.isActive,
                photoCount: photos.filter(
                  (ph) => ph.colorId === x.colorId && (ph.modelId === undefined || ph.modelId === x.modelId),
                ).length,
                ...(await variantLabel(ctx, x)),
              })),
            ),
          };
        }),
      ),
    };
  },
});

export const setPrices = mutation({
  args: { productId: v.id("products"), retailPrice: price, wholesalePrice: price },
  handler: async (ctx, { productId, retailPrice, wholesalePrice }) => {
    await requireAdmin(ctx);
    checkPrice(retailPrice);
    checkPrice(wholesalePrice);
    await ctx.db.patch(productId, { retailPrice });
    const row = await ctx.db
      .query("reseller_prices")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .unique();
    if (wholesalePrice === null) {
      if (row) await ctx.db.delete(row._id);
    } else if (row) await ctx.db.patch(row._id, { price: wholesalePrice });
    else await ctx.db.insert("reseller_prices", { productId, price: wholesalePrice });
  },
});

export const updateVariant = mutation({
  args: { variantId: v.id("variants"), stock: v.number(), isActive: v.boolean() },
  handler: async (ctx, { variantId, stock, isActive }) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)
      throw new ConvexError("Stock invalide.");
    await ctx.db.patch(variantId, { stock, isActive });
  },
});

export const addModel = mutation({
  args: { brandId: v.id("brands"), name: v.string() },
  handler: async (ctx, { brandId, name }) => {
    await requireAdmin(ctx);
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 60) throw new ConvexError("Nom de modèle invalide.");
    const existing = await ctx.db
      .query("models")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
    return ctx.db.insert("models", { brandId, name: clean, sort: existing.length + 1 });
  },
});

export const addColor = mutation({
  args: { name: v.string(), hex: v.string() },
  handler: async (ctx, { name, hex }) => {
    await requireAdmin(ctx);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new ConvexError("Couleur invalide.");
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 40) throw new ConvexError("Nom de couleur invalide.");
    const count = (await ctx.db.query("colors").collect()).length;
    return ctx.db.insert("colors", { name: clean, hex, sort: count + 1 });
  },
});

/** Creates the variant (model + color) for a product, or reactivates it. */
export const upsertVariant = mutation({
  args: {
    productId: v.id("products"),
    modelId: v.id("models"),
    colorId: v.id("colors"),
    stock: v.number(),
  },
  handler: async (ctx, { productId, modelId, colorId, stock }) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(stock) || stock < 0) throw new ConvexError("Stock invalide.");
    const existing = await ctx.db
      .query("variants")
      .withIndex("by_product_model_color", (q) =>
        q.eq("productId", productId).eq("modelId", modelId).eq("colorId", colorId),
      )
      .unique();
    if (existing) await ctx.db.patch(existing._id, { stock, isActive: true });
    else await ctx.db.insert("variants", { productId, modelId, colorId, stock, isActive: true });
  },
});

export const setDeliveryFee = mutation({
  args: { fee: price },
  handler: async (ctx, { fee }) => {
    await requireAdmin(ctx);
    checkPrice(fee);
    await setSetting(ctx, "deliveryFee", fee);
  },
});

const COURIER_KEYS = ["courierName", "courierPhone", "courierEmail", "courierNotes", "deliveryDelay"] as const;

/** Everything on the admin "Livraison" page. */
export const deliverySettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const { fee, freeFrom } = await getDeliveryPricing(ctx);
    const text = Object.fromEntries(
      await Promise.all(COURIER_KEYS.map(async (k) => [k, await getTextSetting(ctx, k)] as const)),
    ) as Record<(typeof COURIER_KEYS)[number], string>;
    return { fee, freeFrom, feeIsDefault: (await getSetting(ctx, "deliveryFee")) === null, ...text };
  },
});

export const setDeliverySettings = mutation({
  args: {
    fee: v.number(),
    freeFrom: price,
    courierName: v.string(),
    courierPhone: v.string(),
    courierEmail: v.string(),
    courierNotes: v.string(),
    deliveryDelay: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    checkPrice(args.fee);
    checkPrice(args.freeFrom);
    await setSetting(ctx, "deliveryFee", args.fee);
    await setSetting(ctx, "freeShippingFrom", args.freeFrom);
    for (const k of COURIER_KEYS) await setSetting(ctx, k, args[k].trim().slice(0, k === "courierNotes" ? 500 : 120));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const setProductImage = mutation({
  args: { productId: v.id("products"), storageId: v.id("_storage") },
  handler: async (ctx, { productId, storageId }) => {
    await requireAdmin(ctx);
    const meta = await ctx.db.system.get(storageId);
    if (!meta || !meta.contentType?.startsWith("image/") || meta.size > 5_000_000) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Image invalide (5 Mo maximum).");
    }
    const product = await ctx.db.get(productId);
    if (product?.imageId) await ctx.storage.delete(product.imageId);
    await ctx.db.patch(productId, { imageId: storageId });
  },
});

// ---------- Bulk photos ----------

/** Where the admin uploads photos: Cloudinary when configured, else Convex storage. */
export const photoBackend = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return cloudinaryConfig() ? ("cloudinary" as const) : ("convex" as const);
  },
});

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
  },
});

/**
 * Signs one direct browser → Cloudinary upload. The API secret never leaves
 * the server; the signature pins the public id, so the upload can only land
 * at the slot for this product + model + color + position.
 */
export const signPhotoUpload = action({
  args: {
    productId: v.id("products"),
    modelId: v.optional(v.id("models")),
    colorId: v.id("colors"),
    position: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ uploadUrl: string; fields: Record<string, string | number> }> => {
    await ctx.runQuery(internal.admin.assertAdmin, {});
    checkPosition(args.position);
    const cfg = cloudinaryConfig();
    if (!cfg) throw new ConvexError("Cloudinary n'est pas configuré.");
    const params = {
      public_id: photoPublicId(args.productId, args.modelId, args.colorId, args.position),
      overwrite: "true",
      invalidate: "true",
      allowed_formats: "jpg,jpeg,png,webp,heic,avif",
      timestamp: Math.floor(Date.now() / 1000),
    };
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
      fields: { ...params, api_key: cfg.apiKey, signature: await cloudinarySignature(params, cfg.apiSecret) },
    };
  },
});

function checkPosition(position: number) {
  if (!Number.isInteger(position) || position < 1 || position > 20)
    throw new ConvexError("Numéro de photo invalide (1 à 20).");
}

/**
 * Attaches an uploaded photo to a product + model + color, replacing the
 * same position. Pass storageId (Convex storage) or publicId + version
 * (Cloudinary, after signPhotoUpload).
 */
export const addPhoto = mutation({
  args: {
    productId: v.id("products"),
    modelId: v.optional(v.id("models")),
    colorId: v.id("colors"),
    position: v.number(),
    storageId: v.optional(v.id("_storage")),
    publicId: v.optional(v.string()),
    version: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    checkPosition(args.position);
    let file: { storageId?: Id<"_storage">; publicId?: string; version?: number };
    if (args.storageId) {
      const meta = await ctx.db.system.get(args.storageId);
      if (!meta || !meta.contentType?.startsWith("image/") || meta.size > 5_000_000) {
        await ctx.storage.delete(args.storageId);
        throw new ConvexError("Image invalide (5 Mo maximum).");
      }
      file = { storageId: args.storageId, publicId: undefined, version: undefined };
    } else if (args.publicId) {
      if (args.publicId !== photoPublicId(args.productId, args.modelId, args.colorId, args.position))
        throw new ConvexError("Photo invalide.");
      file = { publicId: args.publicId, version: args.version, storageId: undefined };
    } else {
      throw new ConvexError("Photo manquante.");
    }
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_variant", (q) =>
        q
          .eq("productId", args.productId)
          .eq("modelId", args.modelId)
          .eq("colorId", args.colorId)
          .eq("position", args.position),
      )
      .unique();
    if (existing) {
      if (existing.storageId && existing.storageId !== file.storageId) await ctx.storage.delete(existing.storageId);
      await ctx.db.patch(existing._id, file);
    } else {
      await ctx.db.insert("photos", {
        productId: args.productId,
        modelId: args.modelId,
        colorId: args.colorId,
        position: args.position,
        ...file,
      });
    }
  },
});

/** Photos per variant (model + color): its own photos plus the shared article × color ones. */
export const photoCounts = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireAdmin(ctx);
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    const counts: Record<string, number> = {};
    for (const x of variants) {
      counts[`${x.modelId}_${x.colorId}`] = photos.filter(
        (p) => p.colorId === x.colorId && (p.modelId === undefined || p.modelId === x.modelId),
      ).length;
    }
    return counts;
  },
});

const PHOTO_SLOTS = [
  { position: 1, label: "Face", required: true },
  { position: 2, label: "Dos", required: false },
  { position: 3, label: "Profil", required: false },
] as const;

/**
 * The photo assistant's shot list for one article: every color it comes in,
 * with the shared Face / Dos / Profil slots and what's already taken.
 */
export const photoChecklist = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireAdmin(ctx);
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    const colorIds = [...new Set(variants.filter((x) => x.isActive).map((x) => x.colorId))];
    const colors = (await Promise.all(colorIds.map((id) => ctx.db.get(id))))
      .filter((c) => c !== null)
      .sort((a, b) => a.sort - b.sort);
    return Promise.all(
      colors.map(async (c) => {
        const photos = (
          await ctx.db
            .query("photos")
            .withIndex("by_product_color", (q) => q.eq("productId", productId).eq("colorId", c._id))
            .collect()
        ).filter((p) => p.modelId === undefined);
        return {
          colorId: c._id,
          name: c.name,
          hex: c.hex,
          slots: await Promise.all(
            PHOTO_SLOTS.map(async (slot) => {
              const photo = photos.find((p) => p.position === slot.position);
              return {
                ...slot,
                photoId: photo?._id ?? null,
                thumbUrl: photo ? await photoUrl(ctx, photo, 300) : null,
                url: photo ? await photoUrl(ctx, photo, 1200) : null,
              };
            }),
          ),
        };
      }),
    );
  },
});

export const removePhoto = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, { photoId }) => {
    await requireAdmin(ctx);
    const photo = await ctx.db.get(photoId);
    if (!photo) return;
    if (photo.storageId) await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photoId);
  },
});

/**
 * Adds a color to an article: finds or creates the color, then creates the
 * variant for every model the article already has, with stock 0 (hidden on
 * the site until stock is set in Produits & stock).
 */
export const addBrand = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireAdmin(ctx);
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 40) throw new ConvexError("Nom de marque invalide.");
    const all = await ctx.db.query("brands").collect();
    if (all.some((b) => norm(b.name) === norm(clean))) throw new ConvexError("Cette marque existe déjà.");
    return ctx.db.insert("brands", { name: clean, sort: all.length + 1 });
  },
});

async function uniqueSlug(ctx: MutationCtx, name: string, except?: Id<"products">) {
  const base = slugify(name) || "article";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const hit = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!hit || hit._id === except) return slug;
  }
}

function checkProductText(name: string, description: string) {
  const n = name.trim();
  if (n.length < 2 || n.length > 80) throw new ConvexError("Nom d'article invalide (2 à 80 caractères).");
  if (description.trim().length > 2000) throw new ConvexError("Description trop longue.");
  return { name: n, description: description.trim() };
}

/** A new article (gamme), active right away. Variants are added afterwards. */
export const createProduct = mutation({
  args: { name: v.string(), description: v.string(), retailPrice: price, wholesalePrice: price },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { name, description } = checkProductText(args.name, args.description);
    checkPrice(args.retailPrice);
    checkPrice(args.wholesalePrice);
    const all = await ctx.db.query("products").collect();
    if (all.some((p) => norm(p.name) === norm(name))) throw new ConvexError("Un article porte déjà ce nom.");
    const productId = await ctx.db.insert("products", {
      name, description, slug: await uniqueSlug(ctx, name), retailPrice: args.retailPrice, isActive: true,
    });
    if (args.wholesalePrice !== null)
      await ctx.db.insert("reseller_prices", { productId, price: args.wholesalePrice });
    return productId;
  },
});

/** Edits an article's name, description and visibility. The web address stays the same. */
export const updateProduct = mutation({
  args: { productId: v.id("products"), name: v.string(), description: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError("Article introuvable.");
    const { name, description } = checkProductText(args.name, args.description);
    await ctx.db.patch(args.productId, { name, description, isActive: args.isActive });
  },
});

export const addColorToProduct = mutation({
  args: { productId: v.id("products"), name: v.string(), hex: v.string() },
  handler: async (ctx, { productId, name, hex }) => {
    await requireAdmin(ctx);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new ConvexError("Couleur invalide.");
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 40) throw new ConvexError("Nom de couleur invalide.");
    const all = await ctx.db.query("colors").collect();
    const existing = all.find((c) => c.name.toLowerCase() === clean.toLowerCase());
    const colorId = existing?._id ?? (await ctx.db.insert("colors", { name: clean, hex, sort: all.length + 1 }));
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    const modelIds = [...new Set(variants.map((x) => x.modelId))];
    if (modelIds.length === 0) throw new ConvexError("Ajoutez d'abord un modèle à cet article.");
    for (const modelId of modelIds) {
      const has = variants.find((x) => x.modelId === modelId && x.colorId === colorId);
      if (!has) await ctx.db.insert("variants", { productId, modelId, colorId, stock: 0, isActive: true });
    }
    return colorId;
  },
});

// ---------- CSV import ----------

const csvRow = v.object({
  line: v.number(),
  range: v.string(), // product name, e.g. "Coque silicone soft-touch"
  brand: v.string(),
  model: v.string(),
  color: v.string(),
  hex: v.optional(v.string()),
  retail: v.optional(v.string()),
  wholesale: v.optional(v.string()),
  stock: v.optional(v.string()),
});

/** "20,5" / "20.500" / "20 DT" → millimes. "" → undefined (unchanged). */
function parseMoney(s: string | undefined): number | null | undefined | "invalid" {
  if (s === undefined) return undefined;
  const t = s.trim().replace(/\s/g, "").replace(/DT$/i, "").replace(",", ".");
  if (t === "") return undefined;
  if (/^\[?xx\]?$/i.test(t)) return null; // explicit placeholder
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return "invalid";
  return Math.round(Number(t) * 1000);
}
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Applies catalog rows from a CSV. With dryRun the same checks run and the
 * result of each row is returned, but nothing is written.
 */
export const importCatalog = mutation({
  args: { rows: v.array(csvRow), dryRun: v.boolean() },
  handler: async (ctx, { rows, dryRun }) => {
    await requireAdmin(ctx);
    if (rows.length > 2000) throw new ConvexError("2000 lignes maximum par import.");

    const products = await ctx.db.query("products").collect();
    const brands = await ctx.db.query("brands").collect();
    const models = await ctx.db.query("models").collect();
    const colors = await ctx.db.query("colors").collect();
    // Names created earlier in this same import (dry run included).
    const created = { products: new Set<string>(), brands: new Set<string>(), models: new Set<string>(), colors: new Set<string>() };

    const results: { line: number; result: string; kind: "new" | "update" | "error" }[] = [];
    for (const r of rows) {
      const err = (msg: string) => results.push({ line: r.line, result: msg, kind: "error" });
      if (!r.range.trim() || !r.brand.trim() || !r.model.trim() || !r.color.trim()) { err("Colonne vide"); continue; }
      const retail = parseMoney(r.retail);
      const wholesale = parseMoney(r.wholesale);
      if (retail === "invalid") { err("Prix détail invalide"); continue; }
      if (wholesale === "invalid") { err("Prix gros invalide"); continue; }
      const stockStr = r.stock?.trim() ?? "";
      const stock = stockStr === "" ? undefined : Number(stockStr);
      if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) { err("Stock invalide"); continue; }
      const hex = r.hex?.trim();
      if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) { err("Code couleur invalide (#RRGGBB)"); continue; }

      let product = products.find((p) => norm(p.name) === norm(r.range));
      let brand = brands.find((b) => norm(b.name) === norm(r.brand));
      let model = brand && models.find((m) => m.brandId === brand!._id && norm(m.name) === norm(r.model));
      let color = colors.find((c) => norm(c.name) === norm(r.color));
      if (!color && !hex) { err("Nouvelle couleur : code_couleur requis"); continue; }

      const isNew = [] as string[];
      if (!product) isNew.push(created.products.has(norm(r.range)) ? "" : "gamme");
      if (!model) isNew.push(created.models.has(norm(r.brand) + "|" + norm(r.model)) ? "" : "modèle");
      if (!color) isNew.push(created.colors.has(norm(r.color)) ? "" : "couleur");
      const labels = isNew.filter(Boolean);

      if (!dryRun) {
        if (!product) {
          const id = await ctx.db.insert("products", {
            name: r.range.trim(), slug: slugify(r.range) || `gamme-${products.length + 1}`,
            description: "", retailPrice: retail ?? null, isActive: true,
          });
          product = (await ctx.db.get(id))!;
          products.push(product);
        }
        if (!brand) {
          const id = await ctx.db.insert("brands", { name: r.brand.trim(), sort: brands.length + 1 });
          brand = (await ctx.db.get(id))!;
          brands.push(brand);
        }
        if (!model) {
          const count = models.filter((m) => m.brandId === brand!._id).length;
          const id = await ctx.db.insert("models", { brandId: brand._id, name: r.model.trim(), sort: count + 1 });
          model = (await ctx.db.get(id))!;
          models.push(model);
        }
        if (!color) {
          const id = await ctx.db.insert("colors", { name: r.color.trim(), hex: hex!, sort: colors.length + 1 });
          color = (await ctx.db.get(id))!;
          colors.push(color);
        } else if (hex && hex.toUpperCase() !== color.hex.toUpperCase()) {
          await ctx.db.patch(color._id, { hex });
        }
        if (retail !== undefined) await ctx.db.patch(product._id, { retailPrice: retail });
        if (wholesale !== undefined) {
          const row = await ctx.db.query("reseller_prices").withIndex("by_product", (q) => q.eq("productId", product!._id)).unique();
          if (wholesale === null) { if (row) await ctx.db.delete(row._id); }
          else if (row) await ctx.db.patch(row._id, { price: wholesale });
          else await ctx.db.insert("reseller_prices", { productId: product._id, price: wholesale });
        }
        const variant = await ctx.db
          .query("variants")
          .withIndex("by_product_model_color", (q) => q.eq("productId", product!._id).eq("modelId", model!._id).eq("colorId", color!._id))
          .unique();
        if (variant) await ctx.db.patch(variant._id, { isActive: true, ...(stock !== undefined ? { stock } : {}) });
        else await ctx.db.insert("variants", { productId: product._id, modelId: model._id, colorId: color._id, stock: stock ?? 0, isActive: true });
      } else {
        if (!product) created.products.add(norm(r.range));
        if (!model) created.models.add(norm(r.brand) + "|" + norm(r.model));
        if (!color) created.colors.add(norm(r.color));
      }

      results.push(
        labels.length
          ? { line: r.line, result: `Nouveau : ${labels.join(", ")}`, kind: "new" }
          : { line: r.line, result: stock !== undefined ? "Stock et prix mis à jour" : "Mis à jour", kind: "update" },
      );
    }
    return results;
  },
});
