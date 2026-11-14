"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";

const TINTS = [
  { tint: "#e6f5ee", ink: "#a8e6cf" },
  { tint: "#fbeaee", ink: "#f6c1cc" },
  { tint: "#e8eefb", ink: "#9cc3f5" },
];

/** Each brand opens the configurator with that brand already chosen. */
export function BrandGrid() {
  const brands = useQuery(api.catalog.brands);
  const products = useQuery(api.catalog.products);
  const target = products?.[0]?.slug;
  if (brands === undefined) {
    return <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] sm:gap-5">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-card sm:h-[300px]" />)}</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] sm:gap-5">
      {brands.map((b, i) => {
        const t = TINTS[i % TINTS.length];
        return (
          <Link
            key={b._id}
            href={target ? `/produit/${target}?marque=${b._id}` : "/produits"}
            className="grid grid-cols-[72px_1fr_auto] items-center gap-4 rounded-[18px] border border-line bg-card p-2.5 text-ink no-underline hover:border-line-strong sm:flex sm:flex-col sm:items-stretch sm:gap-5 sm:rounded-3xl sm:p-7"
          >
            <div aria-hidden className="flex h-[72px] items-center justify-center rounded-xl sm:h-[200px] sm:rounded-[18px]" style={{ background: t.tint }}>
              <div className="h-[52px] w-[26px] rounded-lg sm:h-[170px] sm:w-[86px] sm:rounded-[22px]" style={{ background: t.ink }} />
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <strong className="font-display text-xl sm:text-2xl">{b.name}</strong>
              <span className="text-sm text-muted">{b.modelCount} modèle{b.modelCount > 1 ? "s" : ""}</span>
            </div>
            <span className="flex items-center gap-0.5 pr-1 text-[15px] font-semibold text-red-text sm:hidden">Choisir<ChevronRight aria-hidden className="size-4" /></span>
          </Link>
        );
      })}
    </div>
  );
}
