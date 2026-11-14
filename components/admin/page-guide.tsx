"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { OPEN_GUIDE_EVENT, guideFor } from "./guides";

const noop = () => () => {};
const seenKey = (k: string) => `osit-guide-seen:${k}`;
function seen(k: string) {
  try { return localStorage.getItem(seenKey(k)) === "1"; } catch { return true; }
}
function markSeen(k: string) {
  try { localStorage.setItem(seenKey(k), "1"); } catch { /* private mode */ }
}

/**
 * Opens by itself the first time an admin visits a page, then only from the
 * "?" button. Bottom sheet on phones, centred card on larger screens.
 */
export function PageGuide() {
  const pathname = usePathname();
  const guide = guideFor(pathname);
  const key = guide?.key ?? null;
  // localStorage only exists in the browser: treat the guide as seen until hydrated.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [forcedKey, setForcedKey] = useState<string | null>(null);
  const [stepState, setStepState] = useState({ key, n: 0 });
  const [, rerender] = useState(0);
  const primary = useRef<HTMLButtonElement>(null);

  const step = stepState.key === key ? stepState.n : 0;
  const open = !!key && (forcedKey === key || (hydrated && !seen(key)));
  const setStep = (n: number) => setStepState({ key, n });

  function close() {
    if (key) markSeen(key);
    setForcedKey(null);
    rerender((x) => x + 1);
  }

  useEffect(() => {
    const onOpen = () => { setForcedKey(key); setStepState({ key, n: 0 }); };
    window.addEventListener(OPEN_GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, onOpen);
  }, [key]);

  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });
  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!guide || !open) return null;
  const steps = guide.steps;
  const s = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020a12]/75 md:items-center md:p-6" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[460px] flex-col gap-3 rounded-t-3xl bg-white px-5 pt-5 pb-[max(24px,env(safe-area-inset-bottom))] text-navy shadow-2xl md:rounded-3xl md:pb-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold tracking-[0.1em] text-[#b4161b]">GUIDE · {step + 1} / {steps.length}</span>
          <button type="button" onClick={close} className="min-h-11 px-2 text-[15px] text-[#4a5a6a]">Passer</button>
        </div>
        <span aria-hidden className="text-[34px] leading-none">{s.icon}</span>
        <h2 id="guide-title" className="m-0 font-display text-xl leading-tight">{s.title}</h2>
        <p className="m-0 text-base leading-normal text-[#24364a]">{s.text}</p>
        <div aria-hidden className="flex justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <span key={i} className={i === step ? "h-2 w-[22px] rounded-full bg-cta" : "size-2 rounded-full bg-[#c5d1dd]"} />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-2.5">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
            className="min-h-12 rounded-full border-[1.5px] border-[#c5d1dd] bg-white text-base font-semibold text-navy disabled:opacity-40"
          >
            Retour
          </button>
          <button
            ref={primary}
            type="button"
            onClick={() => (last ? close() : setStep(step + 1))}
            className="min-h-12 rounded-full bg-cta text-base font-semibold text-white hover:bg-cta-hover"
          >
            {last ? "J'ai compris" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
