import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Prices are stored in millimes (1 DT = 1000 millimes) as integers,
 * so "20,000 DT" is 20000. A null price means the client has not
 * provided it yet and the UI shows "[XX] DT".
 */
export const profileStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("refused"),
);
// Cash-on-delivery lifecycle; see ORDER_STATUSES in rules.ts.
export const orderStatus = v.union(
  v.literal("new"),
  v.literal("confirmed"),
  v.literal("ready"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("settled"),
  v.literal("returned"),
  v.literal("cancelled"),
);
export const shippingMethod = v.union(v.literal("home"), v.literal("pickup"));
export const priceType = v.union(v.literal("retail"), v.literal("wholesale"));

export default defineSchema({
  ...authTables,

  // One row per auth user. role and status are only ever written by the
  // server (sign-up callback and admin mutations), never by the user.
  profiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("reseller"), v.literal("admin")),
    // Resellers and admins both start "pending". An admin only gets access
    // once approved by the super admin.
    status: profileStatus,
    // The one account that approves, refuses and removes other admins.
    superAdmin: v.optional(v.boolean()),
    refusalReason: v.optional(v.string()),
    // Shop and address fields are empty strings on admin profiles.
    shopName: v.string(),
    activityType: v.string(),
    taxId: v.optional(v.string()),
    rne: v.optional(v.string()),
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    governorate: v.string(),
    city: v.string(),
    address: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  brands: defineTable({ name: v.string(), sort: v.number() }).index("by_sort", [
    "sort",
  ]),

  models: defineTable({
    brandId: v.id("brands"),
    name: v.string(),
    sort: v.number(),
  }).index("by_brand", ["brandId", "sort"]),

  colors: defineTable({ name: v.string(), hex: v.string(), sort: v.number() }),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    retailPrice: v.union(v.number(), v.null()),
    imageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
  }).index("by_slug", ["slug"]),

  variants: defineTable({
    productId: v.id("products"),
    modelId: v.id("models"),
    colorId: v.id("colors"),
    stock: v.number(),
    isActive: v.boolean(),
  })
    .index("by_product", ["productId"])
    .index("by_product_model_color", ["productId", "modelId", "colorId"]),

  // Product photos per article + color, shown for every model in that
  // color. A photo with modelId is specific to that model and wins over the
  // shared ones. position: 1 = face (required), 2 = dos, 3 = profil, 4+ extra.
  photos: defineTable({
    productId: v.id("products"),
    modelId: v.optional(v.id("models")),
    colorId: v.id("colors"),
    position: v.number(),
    // Cloudinary (production): public id + version, original kept full size.
    publicId: v.optional(v.string()),
    version: v.optional(v.number()),
    // Convex file storage (fallback when Cloudinary isn't configured).
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_variant", ["productId", "modelId", "colorId", "position"])
    .index("by_product_color", ["productId", "colorId", "position"])
    .index("by_product", ["productId"]),

  // Wholesale prices live in their own table and are only read through
  // functions that check the caller is an approved reseller or an admin.
  reseller_prices: defineTable({
    productId: v.id("products"),
    price: v.number(),
  }).index("by_product", ["productId"]),

  orders: defineTable({
    ref: v.string(), // human reference, e.g. OS-0106
    publicId: v.string(), // unguessable id for the confirmation link
    profileId: v.union(v.id("profiles"), v.null()),
    priceType,
    customerName: v.string(),
    phone: v.string(),
    governorate: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    shippingMethod,
    shippingFee: v.number(),
    subtotal: v.number(),
    total: v.number(),
    itemCount: v.number(),
    status: orderStatus,
    note: v.optional(v.string()),
    // Cash to collect at delivery (= total). Missing on orders placed
    // before the COD workflow: read it as total.
    codAmount: v.optional(v.number()),
    courierName: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    confirmationNotes: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    // One entry per status change, oldest first.
    timeline: v.optional(v.array(v.object({ status: orderStatus, at: v.number() }))),
  })
    .index("by_ref", ["ref"])
    .index("by_public_id", ["publicId"])
    .index("by_profile", ["profileId"])
    .index("by_status", ["status"]),

  order_items: defineTable({
    orderId: v.id("orders"),
    variantId: v.id("variants"),
    label: v.string(), // "Samsung Galaxy A15 · Noir", copied at order time
    qty: v.number(),
    unitPrice: v.number(), // copied at order time
  }).index("by_order", ["orderId"]),

  // Shop settings editable in admin: delivery fee, order counter.
  settings: defineTable({
    key: v.string(),
    // Numbers (prices in millimes, counters) or short texts (courier name…).
    value: v.union(v.number(), v.string(), v.null()),
  }).index("by_key", ["key"]),
});
