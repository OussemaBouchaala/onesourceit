"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatDT } from "@/lib/format";
import { Pagination, paginate } from "@/components/ui/pagination";

const PER_PAGE = 12;

export function ProductList() {
  const products = useQuery(api.catalog.products);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (products === undefined)
    return <div className="h-[360px] max-w-sm animate-pulse rounded-3xl bg-card" />;
  if (products.length === 0) return <p className="text-muted">Aucun produit pour le moment.</p>;
  const pg = paginate(products, Number(params.get("page")) || 1, PER_PAGE);
  const go = (p: number) => {
    router.push(p > 1 ? `${pathname}?page=${p}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-5">
        {pg.items.map((p) => (
          <Link
            key={p._id}
            href={`/produit/${p.slug}`}
            className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-5 text-ink no-underline hover:border-line-strong"
          >
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[18px] bg-navy sm:aspect-square">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div aria-hidden className="h-[70%] w-[36%] rounded-[22px] bg-[#a8e6cf]" />
              )}
            </div>
            <strong className="font-display text-xl">{p.name}</strong>
            <span className="flex items-center justify-between gap-3">
              <span className="text-muted">Prix détail <strong className="text-ink">{formatDT(p.retailPrice)}</strong></span>
              <span className="flex items-center gap-0.5 font-semibold text-red-text">Configurer<ChevronRight aria-hidden className="size-4" /></span>
            </span>
          </Link>
        ))}
      </div>
      <Pagination page={pg.page} pageCount={pg.pageCount} onChange={go} />
    </div>
  );
}
