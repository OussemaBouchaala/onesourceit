"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Bottom sheet on phones, centred card on larger screens. Escape or ✕ closes it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020a12]/75 md:items-center md:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line-strong bg-card px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] md:rounded-3xl md:border md:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 font-display text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex size-11 flex-none items-center justify-center rounded-full border-[1.5px] border-line-strong text-ink">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
