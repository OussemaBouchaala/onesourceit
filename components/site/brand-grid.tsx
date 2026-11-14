"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const TINTS = [
  { tint: "#e6f5ee", ink: "#a8e6cf" },
  { tint: "#fbeaee", ink: "#f6c1cc" },
  { tint: "#e8eefb", ink: "#9cc3f5" },
];

export function BrandGrid() {
  const brands = useQuery(api.catalog.brands);
  if (brands === undefined) {
    return <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">{[0, 1, 2].map((i) => <div key={i} className="h-[300px] animate-pulse rounded-3xl bg-card" />)}</div>;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
      {brands.map((b, i) => {
        const t = TINTS[i % TINTS.length];
        return (
          <Link
            key={b._id}
            href="/produits"
            className="flex flex-col gap-5 rounded-3xl border border-line bg-card p-7 text-ink no-underline hover:border-line-strong"
          >
            <div aria-hidden className="flex h-[200px] items-center justify-center rounded-[18px]" style={{ background: t.tint }}>
              <div className="h-[170px] w-[86px] rounded-[22px]" style={{ background: t.ink }} />
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <strong className="font-display text-2xl">{b.name}</strong>
              <span className="text-sm text-muted">{b.modelCount} modèle{b.modelCount > 1 ? "s" : ""}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
