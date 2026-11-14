"use client";
import { use } from "react";
import { ConvexProvider } from "convex/react";
import { getFunctionName } from "convex/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageGuide } from "@/components/admin/page-guide";
import Dash from "@/app/admin/(panel)/page";
import Orders from "@/app/admin/(panel)/commandes/page";
import Resellers from "@/app/admin/(panel)/revendeurs/page";
import Products from "@/app/admin/(panel)/produits/page";
import Team from "@/app/admin/(panel)/equipe/page";

const now = Date.now();
const fx: Record<string, unknown> = {
  "admin:dashboard": { newOrders: 3, pendingResellers: 2, approvedResellers: 14, pendingAdmins: 1, deliveryFee: 7000 },
  "profiles:me": { isAdmin: true, isSuperAdmin: true, role: "admin", status: "approved" },
  "admin:orders": [1, 2, 3].map((i) => ({ _id: "o" + i, ref: "OS-104" + i, createdAt: now, customerName: "Client Test " + i, phone: "+216 20 000 00" + i, priceType: i % 2 ? "wholesale" : "retail", itemCount: i * 5, total: 140000 * i, shippingMethod: i === 2 ? "pickup" : "home", governorate: "Sfax", address: "Rue X", city: "Sfax", note: null, status: ["new", "confirmed", "shipped"][i - 1] })),
  "admin:orderItems": [],
  "admin:resellers": [1, 2].map((i) => ({ _id: "r" + i, createdAt: now, status: "pending", refusalReason: null, shopName: "Phone Center " + i, activityType: "Boutique", taxId: "1234567/A/M/000", rne: null, fullName: "Ahmed Test", email: "a@test.tn", phone: "+21620000000", whatsapp: null, governorate: "Sfax", city: "Sfax", address: "Avenue Habib Bourguiba" })),
  "admin:catalog": { brands: [{ _id: "b1", name: "Samsung" }], models: [{ _id: "m1", brandId: "b1", name: "Galaxy A15", sort: 1 }], colors: [{ _id: "c1", name: "Noir", hex: "#111" }, { _id: "c2", name: "Rose poudré", hex: "#F6C1CC" }],
    products: [{ _id: "p1", name: "Coque silicone soft-touch", retailPrice: 20000, wholesalePrice: null, variants: [{ _id: "v1", modelId: "m1", colorId: "c1", label: "Samsung Galaxy A15 · Noir", hex: "#111", stock: 120, isActive: true }, { _id: "v2", modelId: "m1", colorId: "c2", label: "Samsung Galaxy A15 · Rose poudré", hex: "#F6C1CC", stock: 40, isActive: false }] }, { _id: "p2", name: "Verre trempé 9H", retailPrice: null, wholesalePrice: null, variants: [] }] },
  "admin:photoCounts": { m1_c1: 2 },
  "admin:team": [{ _id: "t1", createdAt: now, status: "approved", superAdmin: true, refusalReason: null, fullName: "Oussema", email: "o@test.tn", phone: "+21620000000" }, { _id: "t2", createdAt: now, status: "pending", superAdmin: false, refusalReason: null, fullName: "Admin Deux", email: "a2@test.tn", phone: "+21620000001" }],
};
const fake = {
  watchQuery: (q: unknown) => ({ onUpdate: () => () => {}, localQueryResult: () => fx[getFunctionName(q as never)], localQueryLogs: () => undefined, journal: () => undefined }),
  mutation: async () => {}, action: async () => {}, connectionState: () => ({}),
};
const pages: Record<string, () => React.ReactNode> = { dash: Dash, commandes: Orders, revendeurs: Resellers, produits: Products, equipe: Team };
const paths: Record<string, string> = { dash: "/admin", commandes: "/admin/commandes", revendeurs: "/admin/revendeurs", produits: "/admin/produits", equipe: "/admin/equipe" };
export default function P({ params }: { params: Promise<{ page: string }> }) {
  const { page } = use(params);
  const Page = pages[page];
  return (
    <ConvexProvider client={fake as never}>
      <div data-path={paths[page]} className="flex min-h-dvh flex-col md:flex-row md:items-start">
        <AdminNav />
        <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-16 sm:px-8 md:py-10"><Page /></main>
        <PageGuide />
      </div>
    </ConvexProvider>
  );
}
