/**
 * Courier service interface. One adapter per Tunisian courier (First
 * Delivery, Intigo, Navex, Aramex…). An adapter turns a confirmed home
 * delivery into a shipment at the courier and returns its tracking number.
 *
 * Adapters run inside Convex actions (they call the courier's API), and
 * read their API keys from Convex environment variables, never from the
 * database: npx convex env set COURIER_API_KEY … --prod
 */
export type ShipmentRequest = {
  ref: string;
  customerName: string;
  phone: string; // +216XXXXXXXX
  governorate: string;
  city: string;
  address: string;
  summary: string; // "15 x Samsung Galaxy A15 · Noir | …"
  pieces: number;
  codAmount: number; // millimes, cash the courier collects
  note?: string;
};

export type Shipment = { courierName: string; trackingNumber: string };

export interface CourierAdapter {
  /** Stable id used in COURIER_PROVIDER, e.g. "firstdelivery". */
  id: string;
  /** Name shown to the admin and stored on the order. */
  name: string;
  createShipment(req: ShipmentRequest, env: Record<string, string | undefined>): Promise<Shipment>;
}
