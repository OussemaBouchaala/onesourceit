import type { Metadata } from "next";
import { Checkout } from "@/components/cart/checkout";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return <Checkout />;
}
