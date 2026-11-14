import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/cart/order-confirmation";

export const metadata: Metadata = { title: "Commande reçue", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderConfirmation publicId={id} />;
}
