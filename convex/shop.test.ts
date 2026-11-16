/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { cloudinarySignature } from "./lib";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const product = await t.run((ctx) => ctx.db.query("products").first());
  await t.run((ctx) => ctx.db.insert("reseller_prices", { productId: product!._id, price: 14000 }));
  const variant = await t.run((ctx) => ctx.db.query("variants").first());
  return { t, product: product!, variant: variant! };
}

async function userWith(
  t: ReturnType<typeof convexTest>,
  role: "reseller" | "admin",
  status: "pending" | "approved" | "refused",
  superAdmin?: boolean,
) {
  const userId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: `${role}-${status}${superAdmin ? "-super" : ""}@test.tn` });
    await ctx.db.insert("profiles", {
      userId, role, status, superAdmin, shopName: "Boutique test", activityType: "Grossiste",
      fullName: "Test", email: `${role}-${status}@test.tn`, phone: "+21620000000",
      governorate: "Sfax", city: "Sfax", address: "Rue test",
    });
    return userId;
  });
  return t.withIdentity({ subject: `${userId}|session` });
}

const order = (variantId: Id<"variants">, qty: number) => ({
  items: [{ variantId, qty }],
  shippingMethod: "pickup" as const,
  customerName: "Client Test",
  phone: "21 050 742",
});

describe("wholesale price gating", () => {
  test("guests, pending and refused resellers never receive the wholesale price", async () => {
    const { t, product } = await setup();
    const pending = await userWith(t, "reseller", "pending");
    const refused = await userWith(t, "reseller", "refused");
    const pages = [
      await t.query(api.catalog.productPage, { slug: product.slug }),
      await pending.query(api.catalog.productPage, { slug: product.slug }),
      await refused.query(api.catalog.productPage, { slug: product.slug }),
    ];
    for (const page of pages) {
      expect(page!.wholesalePrice).toBeNull();
      expect(JSON.stringify(page)).not.toContain("14000");
    }
  });

  test("approved resellers receive it", async () => {
    const { t, product } = await setup();
    const reseller = await userWith(t, "reseller", "approved");
    const page = await reseller.query(api.catalog.productPage, { slug: product.slug });
    expect(page!.wholesalePrice).toBe(14000);
  });

  test("the cart is priced on the server for the viewer", async () => {
    const { t, variant } = await setup();
    const guest = await t.query(api.catalog.priceCart, { variantIds: [variant._id] });
    expect(guest.lines[0].unitPrice).toBe(20000);
    const reseller = await userWith(t, "reseller", "approved");
    const pro = await reseller.query(api.catalog.priceCart, { variantIds: [variant._id] });
    expect(pro.priceType).toBe("wholesale");
    expect(pro.lines[0].unitPrice).toBe(14000);
  });
});

describe("placeOrder", () => {
  test("a guest pays the retail price, recalculated on the server", async () => {
    const { t, variant } = await setup();
    const { publicId, ref } = await t.mutation(api.orders.placeOrder, order(variant._id, 2));
    expect(ref).toBe("OS-0001");
    const saved = await t.query(api.orders.byPublicId, { publicId });
    expect(saved!.priceType).toBe("retail");
    expect(saved!.total).toBe(40000);
    const after = await t.run((ctx) => ctx.db.get(variant._id));
    expect(after!.stock).toBe(variant.stock - 2);
  });

  test("an approved reseller pays wholesale, min 10 in steps of 5", async () => {
    const { t, variant } = await setup();
    const reseller = await userWith(t, "reseller", "approved");
    await expect(reseller.mutation(api.orders.placeOrder, order(variant._id, 7))).rejects.toThrow(/minimum 10/);
    await expect(reseller.mutation(api.orders.placeOrder, order(variant._id, 12))).rejects.toThrow(/minimum 10/);
    const { publicId } = await reseller.mutation(api.orders.placeOrder, order(variant._id, 15));
    const saved = await t.query(api.orders.byPublicId, { publicId });
    expect(saved!.priceType).toBe("wholesale");
    expect(saved!.total).toBe(15 * 14000);
  });

  test("a pending reseller is charged retail", async () => {
    const { t, variant } = await setup();
    const pending = await userWith(t, "reseller", "pending");
    const { publicId } = await pending.mutation(api.orders.placeOrder, order(variant._id, 3));
    expect((await t.query(api.orders.byPublicId, { publicId }))!.total).toBe(60000);
  });

  test("home delivery is refused while the fee is not set, then charged", async () => {
    const { t, variant } = await setup();
    const home = { ...order(variant._id, 1), shippingMethod: "home" as const, governorate: "Sfax", city: "Sfax", address: "Rue de test 1" };
    await expect(t.mutation(api.orders.placeOrder, home)).rejects.toThrow(/frais de livraison/i);
    const admin = await userWith(t, "admin", "approved");
    await admin.mutation(api.admin.setDeliveryFee, { fee: 7000 });
    const { publicId } = await t.mutation(api.orders.placeOrder, home);
    expect((await t.query(api.orders.byPublicId, { publicId }))!.total).toBe(27000);
  });

  test("stock and phone are checked", async () => {
    const { t, variant } = await setup();
    await expect(t.mutation(api.orders.placeOrder, { ...order(variant._id, 1), phone: "123" })).rejects.toThrow(/Téléphone/);
    await t.run((ctx) => ctx.db.patch(variant._id, { stock: 1 }));
    await expect(t.mutation(api.orders.placeOrder, order(variant._id, 2))).rejects.toThrow(/Stock insuffisant/);
  });

  test("cancelling an order puts the stock back", async () => {
    const { t, variant } = await setup();
    await t.mutation(api.orders.placeOrder, order(variant._id, 4));
    const admin = await userWith(t, "admin", "approved");
    const [o] = await admin.query(api.admin.orders, {});
    await expect(admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "cancelled" })).rejects.toThrow(/raison/);
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "cancelled", reason: "Client injoignable" });
    expect((await t.run((ctx) => ctx.db.get(variant._id)))!.stock).toBe(variant.stock);
  });
});

describe("cash on delivery lifecycle", () => {
  const home = (variantId: Id<"variants">, qty: number) => ({
    ...order(variantId, qty),
    shippingMethod: "home" as const,
    governorate: "Sfax",
    city: "Sfax",
    address: "Rue de test 1",
  });

  test("phone: 8 digits starting with 2, 4, 5, 7 or 9, +216 optional", async () => {
    const { normalizeTnPhone } = await import("./rules");
    expect(normalizeTnPhone("+216 21 050 742")).toBe("+21621050742");
    expect(normalizeTnPhone("55.123.456")).toBe("+21655123456");
    expect(normalizeTnPhone("0021698123456")).toBe("+21698123456");
    expect(normalizeTnPhone("31 050 742")).toBeNull();
    expect(normalizeTnPhone("1234567")).toBeNull();
  });

  test("home order: confirm → ship → deliver → settle, with history and tracking", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    await admin.mutation(api.admin.saveDeliverySettings, { fee: 7000, freeFrom: null, courierName: "Livreur Test", courierPhone: "" });
    const { publicId } = await t.mutation(api.orders.placeOrder, home(variant._id, 1));
    const [o] = await admin.query(api.admin.orders, { statuses: ["new"] });
    expect(o.next).toEqual(["confirmed", "cancelled"]);
    // No skipping steps.
    await expect(admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "settled" })).rejects.toThrow(/pas possible/);
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "confirmed" });
    expect((await admin.query(api.admin.courierExport, {}))[0]).toMatchObject({ ref: o.ref, phone: "21050742", codAmount: 27000 });
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "shipped", trackingNumber: "TN123" });
    const mid = await t.query(api.orders.byPublicId, { publicId });
    expect(mid).toMatchObject({ status: "shipped", courierName: "Livreur Test", trackingNumber: "TN123" });
    // Cancelling is no longer possible once the parcel left; use "returned".
    await expect(admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "cancelled", reason: "x" })).rejects.toThrow(/pas possible/);
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "delivered" });
    expect(await admin.query(api.admin.codSummary, {})).toMatchObject({ withCourier: 27000, settled: 0, returnRate: 0 });
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "settled" });
    expect(await admin.query(api.admin.codSummary, {})).toMatchObject({ withCourier: 0, settled: 27000 });
    const done = await t.query(api.orders.byPublicId, { publicId });
    expect(done!.history.map((h) => h.status)).toEqual(["new", "confirmed", "shipped", "delivered", "settled"]);
  });

  test("a returned parcel puts the stock back and counts in the return rate", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    await admin.mutation(api.admin.setDeliveryFee, { fee: 7000 });
    await t.mutation(api.orders.placeOrder, home(variant._id, 3));
    const [o] = await admin.query(api.admin.orders, {});
    for (const status of ["confirmed", "shipped"] as const)
      await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status, courierName: "Livreur Test" });
    expect((await t.run((ctx) => ctx.db.get(variant._id)))!.stock).toBe(variant.stock - 3);
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "returned", reason: "Colis refusé" });
    expect((await t.run((ctx) => ctx.db.get(variant._id)))!.stock).toBe(variant.stock);
    expect((await admin.query(api.admin.codSummary, {})).returnRate).toBe(1);
    expect((await admin.query(api.admin.orders, {}))[0].next).toEqual([]);
  });

  test("store pickup: confirmed → ready → settled, never shipped", async () => {
    const { t, variant } = await setup();
    await t.mutation(api.orders.placeOrder, order(variant._id, 1));
    const admin = await userWith(t, "admin", "approved");
    const [o] = await admin.query(api.admin.orders, {});
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "confirmed" });
    await expect(admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "shipped", courierName: "X" })).rejects.toThrow(/pas possible/);
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "ready" });
    await admin.mutation(api.admin.setOrderStatus, { orderId: o._id, status: "settled" });
    expect((await admin.query(api.admin.orders, {}))[0].status).toBe("settled");
  });

  test("free delivery from the threshold, retail only", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    await admin.mutation(api.admin.saveDeliverySettings, { fee: 7000, freeFrom: 40000, courierName: "", courierPhone: "" });
    const one = await t.mutation(api.orders.placeOrder, home(variant._id, 1));
    expect((await t.query(api.orders.byPublicId, { publicId: one.publicId }))!.shippingFee).toBe(7000);
    const two = await t.mutation(api.orders.placeOrder, home(variant._id, 2));
    expect((await t.query(api.orders.byPublicId, { publicId: two.publicId }))!.shippingFee).toBe(0);
    const reseller = await userWith(t, "reseller", "approved");
    const big = await reseller.mutation(api.orders.placeOrder, home(variant._id, 10));
    expect((await t.query(api.orders.byPublicId, { publicId: big.publicId }))!.shippingFee).toBe(7000);
  });

  test("delivery settings and the courier export are admin-only", async () => {
    const { t } = await setup();
    const reseller = await userWith(t, "reseller", "approved");
    await expect(reseller.query(api.admin.deliverySettings, {})).rejects.toThrow();
    await expect(reseller.query(api.admin.courierExport, {})).rejects.toThrow();
    await expect(reseller.query(api.admin.codSummary, {})).rejects.toThrow();
    await expect(
      reseller.mutation(api.admin.saveDeliverySettings, { fee: 0, freeFrom: null, courierName: "", courierPhone: "" }),
    ).rejects.toThrow();
  });
});

describe("admin", () => {
  test("admin functions refuse everyone else", async () => {
    const { t } = await setup();
    const reseller = await userWith(t, "reseller", "approved");
    await expect(t.query(api.admin.resellers, {})).rejects.toThrow(/administration/);
    await expect(reseller.query(api.admin.catalog, {})).rejects.toThrow(/administration/);
  });

  test("approving a reseller unlocks the wholesale price", async () => {
    const { t, product } = await setup();
    const pending = await userWith(t, "reseller", "pending");
    const admin = await userWith(t, "admin", "approved");
    const [row] = await admin.query(api.admin.resellers, { status: "pending" });
    await admin.mutation(api.admin.setResellerStatus, { profileId: row._id, status: "approved" });
    expect((await pending.query(api.catalog.productPage, { slug: product.slug }))!.wholesalePrice).toBe(14000);
  });

  test("CSV import previews without writing, then applies", async () => {
    const { t } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const rows = [
      { line: 2, range: "Coque silicone soft-touch", brand: "Samsung", model: "Galaxy A16", color: "Noir", retail: "", wholesale: "13,5", stock: "120" },
      { line: 3, range: "Coque silicone soft-touch", brand: "Samsung", model: "Galaxy A16", color: "Lavande", hex: "#C8B6FF", stock: "80" },
      { line: 4, range: "Coque silicone soft-touch", brand: "Samsung", model: "Galaxy A15", color: "Noir", stock: "150" },
      { line: 5, range: "Coque silicone soft-touch", brand: "Infinix", model: "Note 40", color: "Noir", wholesale: "abc" },
    ];
    const preview = await admin.mutation(api.admin.importCatalog, { rows, dryRun: true });
    expect(preview.map((r) => r.kind)).toEqual(["new", "new", "update", "error"]);
    expect(await t.run((ctx) => ctx.db.query("colors").collect())).toHaveLength(5);

    await admin.mutation(api.admin.importCatalog, { rows: rows.slice(0, 3), dryRun: false });
    const cat = await admin.query(api.admin.catalog, {});
    expect(cat.models.some((m) => m.name === "Galaxy A16")).toBe(true);
    expect(cat.colors.some((c) => c.name === "Lavande")).toBe(true);
    expect(cat.products[0].wholesalePrice).toBe(13500);
    expect(cat.products[0].retailPrice).toBe(20000);
  });
});

describe("catalogue editing", () => {
  test("admin creates an article, edits it and adds a brand", async () => {
    const { t } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const id = await admin.mutation(api.admin.createProduct, { name: "Verre trempé 9H", description: "", retailPrice: 8000, wholesalePrice: 5000 });
    await expect(admin.mutation(api.admin.createProduct, { name: "verre trempe 9h", description: "", retailPrice: null, wholesalePrice: null })).rejects.toThrow(/déjà/);
    let cat = await admin.query(api.admin.catalog, {});
    const p = cat.products.find((x) => x._id === id)!;
    expect([p.slug, p.retailPrice, p.wholesalePrice, p.isActive]).toEqual(["verre-trempe-9h", 8000, 5000, true]);

    await admin.mutation(api.admin.updateProduct, { productId: id, name: "Verre trempé 9H+", description: "Dureté 9H", isActive: false });
    cat = await admin.query(api.admin.catalog, {});
    expect(cat.products.find((x) => x._id === id)).toMatchObject({ name: "Verre trempé 9H+", description: "Dureté 9H", isActive: false, slug: "verre-trempe-9h" });
    expect(await t.query(api.catalog.productPage, { slug: "verre-trempe-9h" })).toBeNull();

    await admin.mutation(api.admin.addBrand, { name: "Oppo" });
    await expect(admin.mutation(api.admin.addBrand, { name: "oppo" })).rejects.toThrow(/existe/);
    expect((await admin.query(api.admin.catalog, {})).brands.some((b) => b.name === "Oppo")).toBe(true);
  });

  test("resellers cannot edit the catalogue", async () => {
    const { t } = await setup();
    const reseller = await userWith(t, "reseller", "approved");
    await expect(reseller.mutation(api.admin.createProduct, { name: "X article", description: "", retailPrice: null, wholesalePrice: null })).rejects.toThrow(/administration/);
    await expect(reseller.mutation(api.admin.addBrand, { name: "Oppo" })).rejects.toThrow(/administration/);
  });
});

describe("admin team", () => {
  test("pending and refused admins have no admin access", async () => {
    const { t } = await setup();
    for (const status of ["pending", "refused"] as const) {
      const admin = await userWith(t, "admin", status);
      await expect(admin.query(api.admin.dashboard, {})).rejects.toThrow(/administration/);
      await expect(admin.query(api.admin.resellers, {})).rejects.toThrow(/administration/);
      expect((await admin.query(api.profiles.me, {}))!.isAdmin).toBe(false);
    }
  });

  test("only the super admin sees the team and approves admins", async () => {
    const { t } = await setup();
    const candidate = await userWith(t, "admin", "pending");
    const admin = await userWith(t, "admin", "approved");
    const boss = await userWith(t, "admin", "approved", true);
    await expect(admin.query(api.admin.team, {})).rejects.toThrow(/super admin/);

    const row = (await boss.query(api.admin.team, {})).find((r) => r.status === "pending")!;
    await expect(admin.mutation(api.admin.setAdminStatus, { profileId: row._id, status: "approved" })).rejects.toThrow(/super admin/);
    expect((await boss.query(api.admin.dashboard, {})).pendingAdmins).toBe(1);
    expect((await admin.query(api.admin.dashboard, {})).pendingAdmins).toBe(0);

    await boss.mutation(api.admin.setAdminStatus, { profileId: row._id, status: "approved" });
    expect((await candidate.query(api.profiles.me, {}))!.isAdmin).toBe(true);
    await candidate.query(api.admin.dashboard, {});

    await boss.mutation(api.admin.setAdminStatus, { profileId: row._id, status: "refused", reason: "Départ" });
    await expect(candidate.query(api.admin.dashboard, {})).rejects.toThrow(/administration/);
  });

  test("the super admin cannot be removed", async () => {
    const { t } = await setup();
    const boss = await userWith(t, "admin", "approved", true);
    const self = (await boss.query(api.admin.team, {})).find((r) => r.superAdmin)!;
    await expect(boss.mutation(api.admin.setAdminStatus, { profileId: self._id, status: "refused" })).rejects.toThrow(/super admin/);
  });

  test("makeSuperAdmin promotes an existing account", async () => {
    const { t } = await setup();
    const user = await userWith(t, "reseller", "approved");
    await t.mutation(internal.seed.makeSuperAdmin, { email: "reseller-approved@test.tn" });
    const me = (await user.query(api.profiles.me, {}))!;
    expect([me.isAdmin, me.isSuperAdmin]).toEqual([true, true]);
  });
});

describe("photos on Cloudinary", () => {
  afterEach(() => vi.unstubAllEnvs());
  const env = () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "123");
    vi.stubEnv("CLOUDINARY_API_SECRET", "s3cret");
  };

  test("signature matches Cloudinary's documented example", async () => {
    const sig = await cloudinarySignature(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd",
    );
    expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  test("only admins get an upload signature, and the secret is never sent", async () => {
    env();
    const { t, variant } = await setup();
    const slot = { productId: variant.productId, modelId: variant.modelId, colorId: variant.colorId, position: 1 };
    const reseller = await userWith(t, "reseller", "approved");
    await expect(reseller.action(api.admin.signPhotoUpload, slot)).rejects.toThrow(/administration/);

    const admin = await userWith(t, "admin", "approved");
    const signed = await admin.action(api.admin.signPhotoUpload, slot);
    expect(signed.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    expect(signed.fields.public_id).toBe(`onesourceit/${slot.productId}/${slot.modelId}_${slot.colorId}_1`);
    expect(JSON.stringify(signed)).not.toContain("s3cret");
  });

  test("a stored photo is served resized from Cloudinary; a wrong public id is refused", async () => {
    env();
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const slot = { productId: variant.productId, modelId: variant.modelId, colorId: variant.colorId, position: 1 };
    await expect(admin.mutation(api.admin.addPhoto, { ...slot, publicId: "onesourceit/other", version: 1 })).rejects.toThrow(/invalide/);

    const publicId = `onesourceit/${slot.productId}/${slot.modelId}_${slot.colorId}_1`;
    await admin.mutation(api.admin.addPhoto, { ...slot, publicId, version: 42 });
    await admin.mutation(api.admin.addPhoto, { ...slot, publicId, version: 43 }); // re-import replaces
    const photos = await t.query(api.catalog.variantPhotos, { productId: slot.productId, modelId: slot.modelId, colorId: slot.colorId });
    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe(`https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1200/v43/${publicId}`);
    expect(photos[0].thumbUrl).toContain(",w_200/v43/");
  });
});

describe("photo assistant", () => {
  test("article × color photos show for every model; a model's own photos win", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"], { type: "image/webp" })));
    await admin.mutation(api.admin.addPhoto, { productId: variant.productId, colorId: variant.colorId, position: 1, storageId: sid });

    const others = await t.run((ctx) =>
      ctx.db.query("variants").withIndex("by_product", (q) => q.eq("productId", variant.productId)).collect(),
    );
    const sameColor = others.filter((x) => x.colorId === variant.colorId);
    expect(sameColor.length).toBeGreaterThan(1);
    for (const x of sameColor) {
      const photos = await t.query(api.catalog.variantPhotos, { productId: x.productId, modelId: x.modelId, colorId: x.colorId });
      expect(photos).toHaveLength(1);
    }

    const own = await t.run((ctx) => ctx.storage.store(new Blob(["y"], { type: "image/webp" })));
    await admin.mutation(api.admin.addPhoto, { productId: variant.productId, modelId: variant.modelId, colorId: variant.colorId, position: 1, storageId: own });
    const mine = await t.query(api.catalog.variantPhotos, { productId: variant.productId, modelId: variant.modelId, colorId: variant.colorId });
    expect(mine).toHaveLength(1);
    expect(mine[0]._id).not.toBe((await t.query(api.catalog.variantPhotos, { productId: sameColor[1].productId, modelId: sameColor[1].modelId, colorId: sameColor[1].colorId }))[0]._id);
  });

  test("checklist lists each color with Face / Dos / Profil, and removing a photo empties its slot", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const sid = await t.run((ctx) => ctx.storage.store(new Blob(["x"], { type: "image/webp" })));
    await admin.mutation(api.admin.addPhoto, { productId: variant.productId, colorId: variant.colorId, position: 1, storageId: sid });

    const list = await admin.query(api.admin.photoChecklist, { productId: variant.productId });
    expect(list).toHaveLength(5);
    const row = list.find((c) => c.colorId === variant.colorId)!;
    expect(row.slots.map((s) => s.label)).toEqual(["Face", "Dos", "Profil"]);
    expect(row.slots[0].photoId).not.toBeNull();
    expect(row.slots[1].photoId).toBeNull();

    await admin.mutation(api.admin.removePhoto, { photoId: row.slots[0].photoId! });
    const after = await admin.query(api.admin.photoChecklist, { productId: variant.productId });
    expect(after.find((c) => c.colorId === variant.colorId)!.slots[0].photoId).toBeNull();

    const reseller = await userWith(t, "reseller", "approved");
    await expect(reseller.query(api.admin.photoChecklist, { productId: variant.productId })).rejects.toThrow(/administration/);
  });

  test("adding a color to an article creates it for every model with stock 0", async () => {
    const { t, variant } = await setup();
    const admin = await userWith(t, "admin", "approved");
    const colorId = await admin.mutation(api.admin.addColorToProduct, { productId: variant.productId, name: "Lavande", hex: "#C8B6FF" });
    const variants = await t.run((ctx) =>
      ctx.db.query("variants").withIndex("by_product", (q) => q.eq("productId", variant.productId)).collect(),
    );
    const models = new Set(variants.map((x) => x.modelId));
    const lavande = variants.filter((x) => x.colorId === colorId);
    expect(lavande).toHaveLength(models.size);
    expect(lavande.every((x) => x.stock === 0)).toBe(true);
    // Same name again reuses the color instead of duplicating it.
    expect(await admin.mutation(api.admin.addColorToProduct, { productId: variant.productId, name: "lavande", hex: "#C8B6FF" })).toBe(colorId);
  });
});
