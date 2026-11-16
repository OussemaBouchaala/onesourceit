/**
 * Courier connectors. Today only "manual" exists: the admin hands the parcel
 * to the courier, types the tracking number, or sends the CSV export.
 *
 * When a courier is chosen (First Delivery, Intigo, Navex, Aramex…), add an
 * adapter here that implements CourierAdapter, call it from a Convex action
 * when an order is confirmed, and keep its API key in a Convex environment
 * variable (never in the database, never sent to the browser).
 */

export type CourierParcel = {
  ref: string;
  customerName: string;
  phone: string; // 8 digits
  governorate: string;
  city: string;
  address: string;
  products: string;
  codAmount: number; // millimes to collect
};

export type CourierAdapter = {
  id: string;
  /** Sends the parcel to the courier and returns its tracking number. */
  push(parcel: CourierParcel): Promise<{ trackingNumber: string }>;
};

export const manualCourier: CourierAdapter = {
  id: "manual",
  async push() {
    throw new Error("Envoi manuel : saisissez le numéro de suivi dans « Expédier ».");
  },
};

/** CSV columns the couriers ask for. Amounts in DT with 3 decimals. */
export const COURIER_CSV_HEADER = [
  "Order Ref", "Customer Name", "Phone", "Governorate", "City", "Address", "Product Summary", "COD Amount (TND)",
];

export function courierCsv(rows: CourierParcel[]): string {
  const cell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = rows.map((r) =>
    [r.ref, r.customerName, r.phone, r.governorate, r.city, r.address, r.products, (r.codAmount / 1000).toFixed(3)]
      .map(cell)
      .join(","),
  );
  return [COURIER_CSV_HEADER.join(","), ...lines].join("\r\n");
}
