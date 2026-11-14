"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * The cart lives in the browser (localStorage) and needs no login.
 * It holds variant ids and quantities only: prices are always fetched
 * from Convex (catalog.priceCart) and recalculated by orders.placeOrder.
 */
export type CartLine = { variantId: Id<"variants">; qty: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (variantId: Id<"variants">, qty: number) => void;
  setQty: (variantId: Id<"variants">, qty: number) => void;
  remove: (variantId: Id<"variants">) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "onesource-cart-v1";

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (l): l is CartLine =>
            typeof l?.variantId === "string" && Number.isInteger(l?.qty) && l.qty > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Read the saved cart after mount (localStorage doesn't exist on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(load());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* private mode: cart still works for this tab */
    }
  }, [lines, ready]);

  const add = useCallback((variantId: Id<"variants">, qty: number) => {
    setLines((prev) => {
      const found = prev.find((l) => l.variantId === variantId);
      return found
        ? prev.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { variantId, qty }];
    });
  }, []);
  const setQty = useCallback((variantId: Id<"variants">, qty: number) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, qty } : l)));
  }, []);
  const remove = useCallback((variantId: Id<"variants">) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((a, l) => a + l.qty, 0), ready, add, setQty, remove, clear }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
