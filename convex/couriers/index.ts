import type { CourierAdapter } from "./types";
import { placeholderAdapter } from "./placeholder";

/**
 * Registered couriers. Until one is chosen, orders are dispatched by hand:
 * the admin types the courier and the tracking number (no adapter needed).
 * To plug a real API: write its adapter, list it here, then set
 * COURIER_PROVIDER=<id> (and its keys) in the Convex environment.
 */
const ADAPTERS: CourierAdapter[] = [
  placeholderAdapter("firstdelivery", "First Delivery"),
  placeholderAdapter("intigo", "Intigo"),
  placeholderAdapter("navex", "Navex"),
  placeholderAdapter("aramex", "Aramex"),
];

export function getCourierAdapter(id: string | undefined): CourierAdapter | null {
  if (!id) return null;
  return ADAPTERS.find((a) => a.id === id) ?? null;
}
