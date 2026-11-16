import type { CourierAdapter } from "./types";

/**
 * Template for a real courier API. Copy it per courier (firstdelivery.ts,
 * intigo.ts, navex.ts, aramex.ts), fill in the endpoint and field names
 * from the courier's documentation, then register it in index.ts.
 */
export function placeholderAdapter(id: string, name: string): CourierAdapter {
  return {
    id,
    name,
    async createShipment(req, env) {
      if (!env.COURIER_API_KEY) throw new Error(`${name} : clé API manquante (COURIER_API_KEY).`);
      // Example of what the real call will look like:
      // const res = await fetch(env.COURIER_API_URL + "/shipments", {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${env.COURIER_API_KEY}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({ reference: req.ref, name: req.customerName, phone: req.phone.slice(4),
      //     governorate: req.governorate, city: req.city, address: req.address,
      //     designation: req.summary, pieces: req.pieces, cod: req.codAmount / 1000 }),
      // });
      // const json = await res.json();
      // return { courierName: name, trackingNumber: String(json.barcode) };
      throw new Error(`${name} : intégration API pas encore branchée. Saisissez le numéro de suivi à la main. (${req.ref})`);
    },
  };
}
