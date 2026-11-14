"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Camera, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePhotoUpload } from "./use-photo-upload";

const RULES = [
  { icon: "⬜", title: "Fond clair uni", text: "Blanc ou gris clair, sans objet autour." },
  { icon: "☀️", title: "Lumière du jour", text: "Près d'une fenêtre, sans flash ni filtre." },
  { icon: "🎯", title: "Produit centré", text: "Téléphone à la verticale, produit au milieu." },
  { icon: "📐", title: "Même cadrage", text: "Même distance et angle pour chaque couleur." },
];

const GUIDE_KEY = "photos-guide-open";
const step = "m-0 font-display text-[13px] font-semibold tracking-[0.12em] text-red-text uppercase";

export function PhotoAssistant() {
  const catalog = useQuery(api.admin.catalog);
  const [productId, setProductId] = useState("");
  const activeId = (productId || catalog?.products[0]?._id || "") as Id<"products"> | "";
  const checklist = useQuery(api.admin.photoChecklist, activeId ? { productId: activeId } : "skip");
  const { backend, upload } = usePhotoUpload();
  const removePhoto = useMutation(api.admin.removePhoto);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(GUIDE_KEY) === "0") setGuideOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);
  function toggleGuide() {
    setGuideOpen((o) => {
      try { localStorage.setItem(GUIDE_KEY, o ? "0" : "1"); } catch {}
      return !o;
    });
  }

  async function take(colorId: Id<"colors">, position: number, file: File | undefined) {
    if (!file || !activeId) return;
    const key = `${colorId}-${position}`;
    setError(null);
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await upload({ productId: activeId, colorId, position }, file);
    } catch (e) {
      setError(`Envoi impossible : ${String((e as { data?: string })?.data ?? (e as Error).message)}`);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  if (!catalog || !backend) return <p className="text-muted">Chargement…</p>;
  const product = catalog.products.find((p) => p._id === activeId);
  const done = checklist?.filter((c) => c.slots[0].photoId).length ?? 0;
  const total = checklist?.length ?? 0;
  const missing = checklist?.filter((c) => !c.slots[0].photoId).map((c) => c.name) ?? [];
  const shareText = product
    ? `Photos à prendre — ${product.name}\n${checklist?.map((c) => `${c.slots[0].photoId ? "✅" : "⬜"} ${c.name} : face${c.slots[1].photoId ? "" : ", dos"}${c.slots[2].photoId ? "" : ", profil"}`).join("\n")}\n\nFond clair, lumière du jour, produit centré, même cadrage.`
    : "";

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      {/* 1 · Préparer */}
      <section aria-labelledby="ph-1" className="flex flex-col gap-3">
        <h2 id="ph-1" className={step}>1 · Préparer</h2>
        <Label>Article
          <NativeSelect value={activeId} onChange={(e) => setProductId(e.target.value)}>
            {catalog.products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </NativeSelect>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          {checklist?.map((c) => (
            <span key={c.colorId} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 text-sm">
              <span aria-hidden className="size-3.5 rounded-full border border-white/25" style={{ background: c.hex }} />
              {c.name}
            </span>
          ))}
          {activeId && <AddColor productId={activeId} />}
        </div>
      </section>

      {/* 2 · Guide */}
      <section aria-labelledby="ph-2" className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-4">
        <button type="button" onClick={toggleGuide} aria-expanded={guideOpen} className="flex min-h-8 items-center justify-between gap-3 bg-transparent p-0 text-left text-ink">
          <span id="ph-2" className={step}>2 · Comment photographier</span>
          <ChevronDown aria-hidden className={cn("size-5 transition-transform", guideOpen && "rotate-180")} />
        </button>
        {guideOpen && (
          <>
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
              {RULES.map((r) => (
                <li key={r.title} className="flex flex-col gap-2 rounded-[14px] bg-navy p-3">
                  <span aria-hidden className="text-[22px]">{r.icon}</span>
                  <strong className="text-sm leading-snug">{r.title}</strong>
                  <span className="text-[13px] leading-snug text-muted">{r.text}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[13px] text-soft">Face obligatoire. Dos et profil si possible. Pas besoin de renommer les fichiers.</p>
          </>
        )}
      </section>

      {/* 3 · Photos */}
      <section aria-labelledby="ph-3" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ph-3" className={step}>3 · Prendre les photos</h2>
          <span className="text-sm text-soft"><strong className="text-ink">{done}</strong> / {total} faces</span>
        </div>
        <div role="progressbar" aria-label="Photos de face prises" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-card">
          <div className="h-full rounded-full bg-cta transition-[width]" style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
        </div>
        {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad-ink">{error}</p>}
        {checklist === undefined && <div className="h-40 animate-pulse rounded-[18px] bg-card" />}
        {checklist?.length === 0 && <p className="m-0 text-muted">Cet article n&apos;a pas encore de couleur. Ajoutez-en une ci-dessus.</p>}
        {checklist?.map((c) => {
          const hasFace = !!c.slots[0].photoId;
          return (
            <article key={c.colorId} className={cn("flex flex-col gap-2.5 rounded-[18px] border-[1.5px] bg-card p-3", hasFace ? "border-line" : "border-red-text")}>
              <div className="flex items-center justify-between gap-2">
                <strong className="inline-flex items-center gap-2 text-base">
                  <span aria-hidden className="size-4 rounded-full border border-white/25" style={{ background: c.hex }} />
                  {c.name}
                </strong>
                <Badge variant={hasFace ? "ok" : "bad"}>{hasFace ? "Prête" : "Face manquante"}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {c.slots.map((s) => {
                  const key = `${c.colorId}-${s.position}`;
                  const loading = busy[key];
                  const inputId = `slot-${key}`;
                  return (
                    <div key={s.position} className="relative">
                      <label
                        htmlFor={inputId}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); void take(c.colorId, s.position, e.dataTransfer.files[0]); }}
                        className={cn(
                          "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[14px] text-[13px] font-semibold",
                          s.thumbUrl ? "border-[1.5px] border-line bg-navy" : s.required ? "border-2 border-dashed border-red-text text-red-text" : "border-2 border-dashed border-line-strong text-muted",
                        )}
                      >
                        {loading ? (
                          <Loader2 aria-hidden className="size-6 animate-spin" />
                        ) : s.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.thumbUrl} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <Camera aria-hidden className="size-6" strokeWidth={1.8} />
                        )}
                        <span className={cn(s.thumbUrl && "absolute bottom-1.5 left-1.5 rounded-md bg-navy/85 px-1.5 py-0.5 text-white")}>
                          {loading ? "Envoi…" : `${s.label}${s.required && !s.thumbUrl ? " *" : ""}`}
                        </span>
                        <span className="sr-only">{s.thumbUrl ? `Refaire la photo ${s.label} — ${c.name}` : `Prendre la photo ${s.label} — ${c.name}`}</span>
                      </label>
                      <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        disabled={loading}
                        onChange={(e) => { void take(c.colorId, s.position, e.target.files?.[0]); e.target.value = ""; }}
                      />
                      {s.photoId && !loading && (
                        <button
                          type="button"
                          onClick={() => removePhoto({ photoId: s.photoId! })}
                          aria-label={`Supprimer la photo ${s.label} — ${c.name}`}
                          className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full border border-line bg-navy text-ink"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      {/* 4 · Vérifier */}
      <section aria-labelledby="ph-4" className="flex flex-col gap-2.5">
        <h2 id="ph-4" className={step}>4 · Vérifier</h2>
        <p className="m-0 text-[15px] text-soft">
          {total === 0 ? "Aucune couleur pour l'instant." : missing.length ? `Il manque la face : ${missing.join(", ")}.` : "Toutes les couleurs ont leur photo de face."}
        </p>
        <Button asChild variant="secondary">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">Envoyer la liste sur WhatsApp</a>
        </Button>
        <Link href="/admin/import" className="text-center text-sm text-muted">Import avancé (noms de fichiers)</Link>
      </section>
    </div>
  );
}

function AddColor({ productId }: { productId: Id<"products"> }) {
  const addColorToProduct = useMutation(api.admin.addColorToProduct);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#C8B6FF");
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-full border-[1.5px] border-dashed border-line-strong px-3 text-sm text-ink">
        <Plus aria-hidden className="size-4" /> Couleur
      </button>
    );
  return (
    <form
      className="flex w-full flex-wrap items-end gap-2 rounded-2xl border border-line bg-card p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await addColorToProduct({ productId, name, hex });
          setName("");
          setOpen(false);
        } catch (err) {
          setError(String((err as { data?: string })?.data ?? "Ajout impossible."));
        }
      }}
    >
      <Label className="min-w-0 flex-1">Nom de la couleur<Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder="Lavande" /></Label>
      <Label>Teinte<input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border-[1.5px] border-line-strong bg-navy-deep p-1" /></Label>
      <Button type="submit" size="sm">Ajouter</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      <p className="m-0 w-full text-[13px] text-muted">Ajoutée à tous les modèles de l&apos;article, stock 0. Réglez le stock dans Produits &amp; stock.</p>
      {error && <p role="alert" className="m-0 w-full text-sm text-red-text">{error}</p>}
    </form>
  );
}
