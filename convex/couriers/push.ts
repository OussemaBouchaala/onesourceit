import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError, v } from "convex/values";
import { getCourierAdapter } from "./index";
import type { Shipment, ShipmentRequest } from "./types";

/** Which courier API is plugged in (COURIER_PROVIDER), if any. */
export const provider = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runQuery(internal.admin.assertAdmin, {});
    const adapter = getCourierAdapter(process.env.COURIER_PROVIDER);
    return adapter ? { id: adapter.id, name: adapter.name } : null;
  },
});

export const shipmentRequest = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const o = await ctx.db.get(orderId);
    if (!o) return null;
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    return {
      status: o.status,
      shippingMethod: o.shippingMethod,
      req: {
        ref: o.ref,
        customerName: o.customerName,
        phone: o.phone,
        governorate: o.governorate ?? "",
        city: o.city ?? "",
        address: o.address ?? "",
        summary: items.map((i) => `${i.qty} x ${i.label}`).join(" | "),
        pieces: o.itemCount,
        codAmount: o.codAmount ?? o.total,
        note: o.note,
      },
    };
  },
});

/**
 * Sends a confirmed home delivery to the configured courier's API and
 * returns the tracking number. The admin page then marks the order
 * "Expédiée" with it (admin.setOrderStatus), like a manual dispatch.
 */
export const createShipment = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<Shipment> => {
    await ctx.runQuery(internal.admin.assertAdmin, {});
    const adapter = getCourierAdapter(process.env.COURIER_PROVIDER);
    if (!adapter) throw new ConvexError("Aucune API de livreur n'est configurée.");
    const data: { status: string; shippingMethod: string; req: ShipmentRequest } | null = await ctx.runQuery(internal.couriers.push.shipmentRequest, { orderId });
    if (!data) throw new ConvexError("Commande introuvable.");
    if (data.status !== "confirmed" || data.shippingMethod !== "home")
      throw new ConvexError("Seule une livraison à domicile confirmée peut être envoyée au livreur.");
    try {
      return await adapter.createShipment(data.req, process.env);
    } catch (e) {
      throw new ConvexError((e as Error).message);
    }
  },
});
