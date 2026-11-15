import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductList } from "@/components/configurator/product-list";
import { Eyebrow } from "@/components/site/eyebrow";

export const metadata: Metadata = { title: "Nos produits" };

export default function ProductsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-5 py-[clamp(32px,8vw,80px)]">
      <div className="flex flex-col gap-3">
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="m-0 font-display text-[clamp(34px,9vw,52px)] leading-none font-bold uppercase">
          Nos <em className="text-red-text">produits</em>
        </h1>
        <p className="m-0 max-w-[560px] text-[17px] text-soft">
          Choisissez une gamme, puis la marque, le modèle et la couleur.
        </p>
      </div>
      <Suspense fallback={<div className="h-[360px] max-w-sm animate-pulse rounded-3xl bg-card" />}>
        <ProductList />
      </Suspense>
    </main>
  );
}
