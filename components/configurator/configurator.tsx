"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Lock, Minus, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCart } from "@/components/cart/cart-context";
import { Eyebrow } from "@/components/site/eyebrow";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { formatDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_RETAIL_QTY, WHOLESALE_MIN_QTY, WHOLESALE_STEP } from "@/convex/rules";

export function Configurator({ slug }: { slug: string }) {
  const data = useQuery(api.catalog.productPage, { slug });
  const { add, count } = useCart();
  const [brandId, setBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [colorId, setColorId] = useState<string>("");
  const [qtyInput, setQty] = useState<number | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const approved = !!data?.viewer.isApproved;
  const min = approved ? WHOLESALE_MIN_QTY : 1;
  const step = approved ? WHOLESALE_STEP : 1;
  const max = approved ? 5000 : MAX_RETAIL_QTY;
  const qty = qtyInput ?? min;
  const unit = approved ? (data?.wholesalePrice ?? null) : (data?.product.retailPrice ?? null);

  const models = useMemo(
    () => (data?.models ?? []).filter((m) => m.brandId === brandId),
    [data, brandId],
  );
  const colors = useMemo(() => {
    if (!data || !modelId) return data?.colors ?? [];
    const ids = new Set(data.variants.filter((v) => v.modelId === modelId).map((v) => v.colorId));
    return data.colors.filter((c) => ids.has(c._id));
  }, [data, modelId]);
  const variant = data?.variants.find((v) => v.modelId === modelId && v.colorId === colorId);
  const color = data?.colors.find((c) => c._id === colorId);
  const photos = useQuery(
    api.catalog.variantPhotos,
    data && modelId && colorId
      ? { productId: data.product._id, modelId: modelId as Id<"models">, colorId: colorId as Id<"colors"> }
      : "skip",
  );
  const [photoIdx, setPhotoIdx] = useState(0);

  if (data === undefined) {
    return <main className="mx-auto w-full max-w-[1200px] px-5 py-12"><div className="h-[520px] animate-pulse rounded-[28px] bg-card" /></main>;
  }
  if (data === null) {
    return (
      <main className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 px-5 py-16">
        <h1 className="m-0 font-display text-3xl">Produit introuvable</h1>
        <Link href="/produits">Voir tous les produits</Link>
      </main>
    );
  }

  const brandName = data.brands.find((b) => b._id === brandId)?.name;
  const modelName = data.models.find((m) => m._id === modelId)?.name;
  const canAdd = !!variant && unit !== null;
  const photo = photos && photos.length > 0 ? photos[Math.min(photoIdx, photos.length - 1)] : null;

  function addToCart() {
    if (!variant) return;
    add(variant._id, qty);
    setAdded(`${brandName} ${modelName} · ${color?.name} × ${qty}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-[clamp(24px,5vw,48px)] px-4 pt-[clamp(20px,5vw,56px)] pb-[clamp(48px,8vw,96px)] sm:px-5">
      {/* Visual */}
      <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-3">
        <div className="flex h-[clamp(300px,80vw,520px)] items-center justify-center overflow-hidden rounded-[28px] bg-card">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={`${data.product.name} ${brandName} ${modelName} ${color?.name}`} className="size-full object-contain" />
          ) : (
            <div aria-hidden className="relative h-[min(390px,70%)] w-[min(190px,34%)] rounded-[46px] shadow-[0_30px_60px_rgba(0,0,0,0.25)]" style={{ background: color?.hex ?? "#a8e6cf" }}>
              <div className="absolute top-[6%] left-[12%] h-[22%] w-[37%] rounded-[22px] bg-black/15" />
            </div>
          )}
        </div>
        {photos && photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setPhotoIdx(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === photoIdx}
                className={cn("size-16 flex-none overflow-hidden rounded-xl border-2 bg-card", i === photoIdx ? "border-cta" : "border-line")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {!photo && <p className="m-0 text-[13px] text-muted">Visuel indicatif. Photos produit à venir.</p>}
      </div>

      {/* Configurator */}
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Configurateur</Eyebrow>
          <h1 className="m-0 font-display text-[clamp(34px,9vw,52px)] leading-none font-bold uppercase">
            {data.product.name}
          </h1>
          <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
            <div className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-card px-5 py-4">
              <span className="text-[13px] font-semibold tracking-[0.1em] text-muted uppercase">Prix détail</span>
              <strong className="font-display text-[34px] leading-none">{formatDT(data.product.retailPrice)}</strong>
              <span className="text-[13px] text-muted">TTC, à l&apos;unité</span>
            </div>
            <WholesaleCard
              approved={approved}
              price={data.wholesalePrice}
              status={data.viewer.status}
            />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
          <label className="flex flex-col gap-2 text-[15px] font-semibold">
            1. Marque
            <NativeSelect
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setModelId("");
                setColorId("");
                setAdded(null);
              }}
            >
              <option value="">Choisir une marque…</option>
              {data.brands.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-2 text-[15px] font-semibold">
            2. Modèle
            <NativeSelect
              value={modelId}
              disabled={!brandId}
              onChange={(e) => {
                setModelId(e.target.value);
                setColorId("");
                setPhotoIdx(0);
                setAdded(null);
              }}
            >
              <option value="">{brandId ? `Choisir un modèle ${brandName}…` : "Choisissez d'abord une marque"}</option>
              {models.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" disabled={!modelId}>
          <legend className="mb-3 text-[15px] font-semibold">
            3. Couleur{" "}
            <span className="font-normal text-muted">
              — {modelId ? (color?.name ?? "choisissez") : "disponible après le modèle"}
            </span>
          </legend>
          <div className="flex flex-wrap gap-3.5">
            {colors.map((c) => {
              const on = c._id === colorId;
              return (
                <button
                  key={c._id}
                  type="button"
                  aria-label={c.name}
                  aria-pressed={on}
                  title={c.name}
                  onClick={() => {
                    setColorId(c._id);
                    setPhotoIdx(0);
                    setAdded(null);
                  }}
                  className={cn(
                    "size-12 rounded-full transition disabled:opacity-35",
                    on ? "border-[3px] border-cta shadow-[inset_0_0_0_3px_#fff]" : "border-[1.5px] border-line-strong",
                  )}
                  style={{ background: c.hex }}
                />
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">4. Quantité</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-line-strong bg-card">
              <button type="button" onClick={() => setQty(Math.max(min, qty - step))} disabled={qty <= min} aria-label="Diminuer la quantité" className="inline-flex size-12 items-center justify-center disabled:opacity-40">
                <Minus aria-hidden className="size-5" />
              </button>
              <span aria-live="polite" className="min-w-11 text-center font-semibold">{qty}</span>
              <button type="button" onClick={() => setQty(Math.min(max, qty + step))} disabled={qty >= max} aria-label="Augmenter la quantité" className="inline-flex size-12 items-center justify-center disabled:opacity-40">
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
            <Button onClick={addToCart} disabled={!canAdd}>
              Ajouter au panier{unit !== null ? ` · ${formatDT(unit * qty)}` : ""}
            </Button>
          </div>
          <p className="m-0 text-[13px] text-muted">
            {approved
              ? `Prix de gros : minimum ${WHOLESALE_MIN_QTY} pièces par modèle, par multiples de ${WHOLESALE_STEP}.`
              : "Prix détail appliqué. Revendeur ? Connectez-vous pour le prix de gros."}
            {approved && unit === null && " Prix de gros pas encore défini pour cette gamme."}
          </p>
        </div>

        {added && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-[15px] font-medium text-ok-ink">
            <span className="flex items-center gap-2"><Check aria-hidden className="size-5" /> Ajouté au panier : {added}</span>
            <Link href="/panier" className="font-semibold text-ok-ink">Voir le panier ({count})</Link>
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-3 border-t border-line bg-card px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] md:hidden">
          <span className="text-sm text-soft">{count} article{count > 1 ? "s" : ""} au panier</span>
          <Button asChild size="sm">
            <Link href="/panier">Voir le panier</Link>
          </Button>
        </div>
      )}
    </main>
  );
}

function WholesaleCard({
  approved,
  price,
  status,
}: {
  approved: boolean;
  price: number | null;
  status: "pending" | "approved" | "refused" | null;
}) {
  if (approved) {
    return (
      <div className="flex flex-col gap-1.5 rounded-[18px] border-[1.5px] border-cta bg-[#3a1a22] px-5 py-4">
        <span className="text-[13px] font-semibold tracking-[0.1em] text-red-text uppercase">Prix en gros</span>
        <strong className="font-display text-[34px] leading-none">{formatDT(price)}</strong>
        <span className="text-[13px] text-soft">Revendeur validé · prix par pièce</span>
      </div>
    );
  }
  // Not approved: the server sent no wholesale price. The blurred figure is a
  // fixed fake value, never the real one.
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] bg-card px-5 py-4">
      <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.1em] text-red-text uppercase">
        <Lock aria-hidden className="size-3.5" /> Prix en gros
      </span>
      <strong aria-hidden className="font-display text-[34px] leading-none blur-[9px] select-none">00,000 DT</strong>
      <span className="text-[13px] text-[#c9d2de]">
        {status === "pending" ? (
          "Votre compte revendeur est en attente de validation."
        ) : status === "refused" ? (
          "Votre demande revendeur n'a pas été acceptée."
        ) : (
          <>
            Réservé aux revendeurs validés.{" "}
            <Link href="/inscription" className="font-semibold text-white">Créer un compte</Link> ·{" "}
            <Link href="/connexion" className="font-semibold text-white">Se connecter</Link>
          </>
        )}
      </span>
    </div>
  );
}
