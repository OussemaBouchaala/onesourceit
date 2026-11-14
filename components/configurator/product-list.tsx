"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDT } from "@/lib/format";

export function ProductList() {
  const products = useQuery(api.catalog.products);
  if (products === undefined)
    return <div className="h-[360px] max-w-sm animate-pulse rounded-3xl bg-card" />;
  if (products.length === 0) return <p className="text-muted">Aucun produit pour le moment.</p>;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-5">
      {products.map((p) => (
        <Link
          key={p._id}
          href={`/produit/${p.slug}`}
          className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-5 text-ink no-underline hover:border-line-strong"
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[18px] bg-navy">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div aria-hidden className="h-[70%] w-[36%] rounded-[22px] bg-[#a8e6cf]" />
            )}
          </div>
          <strong className="font-display text-xl">{p.name}</strong>
          <span className="text-muted">
            Prix détail <strong className="text-ink">{formatDT(p.retailPrice)}</strong>
          </span>
        </Link>
      ))}
    </div>
  );
}
