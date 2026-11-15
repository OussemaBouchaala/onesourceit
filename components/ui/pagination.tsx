"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page numbers around the current one, with gaps: 1 … 4 5 6 … 12. */
function pages(current: number, count: number): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= count; p++) {
    if (p === 1 || p === count || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

export function Pagination({ page, pageCount, onChange, className }: { page: number; pageCount: number; onChange: (p: number) => void; className?: string }) {
  if (pageCount <= 1) return null;
  const btn = "inline-flex size-11 items-center justify-center rounded-full text-[15px] font-semibold";
  return (
    <nav aria-label="Pages" className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Page précédente" className={cn(btn, "border-[1.5px] border-line-strong text-ink disabled:opacity-35")}>
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      {pages(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`g${i}`} aria-hidden className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={cn(btn, p === page ? "bg-white text-navy" : "border-[1.5px] border-line-strong text-ink hover:bg-card")}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Page suivante" className={cn(btn, "border-[1.5px] border-line-strong text-ink disabled:opacity-35")}>
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  );
}

/** Slices a list for the given page (1-based) and clamps the page number. */
export function paginate<T>(items: T[], page: number, perPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pageCount);
  return { pageCount, page: current, items: items.slice((current - 1) * perPage, current * perPage) };
}
