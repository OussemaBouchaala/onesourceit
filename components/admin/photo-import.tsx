"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { matchName, parseFileName } from "@/lib/import";
import { usePhotoUpload } from "./use-photo-upload";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  file: File;
  preview: string;
  parsedModel: string | null;
  brandId: string | null;
  modelId: string; // "" = unmatched, "new" = create parsedModel under brandId
  colorId: string;
  position: number;
  state: "ready" | "uploading" | "done" | "error";
  error?: string;
};

export function PhotoImport() {
  const catalog = useQuery(api.admin.catalog);
  const { backend, upload: uploadPhoto } = usePhotoUpload();
  const addModel = useMutation(api.admin.addModel);
  const [productId, setProductId] = useState<string>("");
  const [compress, setCompress] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const activeProductId = productId || catalog?.products[0]?._id || "";
  useEffect(() => () => rows.forEach((r) => URL.revokeObjectURL(r.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const brandName = useMemo(() => new Map<string, string>(catalog?.brands.map((b) => [b._id, b.name])), [catalog]);

  function addFiles(list: FileList | null) {
    if (!list || !catalog) return;
    const next: Row[] = [...list].filter((f) => f.type.startsWith("image/")).map((file, i) => {
      const parsed = parseFileName(file.name);
      const m = parsed ? matchName(parsed, catalog.brands, catalog.models, catalog.colors) : null;
      return {
        key: `${file.name}-${file.size}-${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        parsedModel: parsed?.model ?? null,
        brandId: m?.brand?._id ?? null,
        modelId: m?.model?._id ?? "",
        colorId: m?.color?._id ?? "",
        position: parsed?.position ?? 1,
        state: "ready",
      };
    });
    setRows((r) => [...r, ...next]);
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const isOk = (r: Row) => r.modelId !== "" && r.colorId !== "";
  const ready = rows.filter((r) => r.state === "ready" && isOk(r));
  const toFix = rows.filter((r) => r.state === "ready" && !isOk(r));
  const done = rows.filter((r) => r.state === "done").length;

  async function upload() {
    if (!activeProductId) return;
    setBusy(true);
    const created = new Map<string, Id<"models">>();
    for (const r of ready) {
      update(r.key, { state: "uploading" });
      try {
        let modelId = r.modelId as Id<"models">;
        if (r.modelId === "new") {
          const k = `${r.brandId}|${r.parsedModel}`;
          modelId = created.get(k) ?? (await addModel({ brandId: r.brandId as Id<"brands">, name: titleCase(r.parsedModel!) }));
          created.set(k, modelId);
        }
        const slot = { productId: activeProductId as Id<"products">, modelId, colorId: r.colorId as Id<"colors">, position: r.position };
        await uploadPhoto(slot, r.file, { compress });
        update(r.key, { state: "done" });
      } catch (e) {
        update(r.key, { state: "error", error: String((e as { data?: string })?.data ?? (e as Error).message) });
      }
    }
    setBusy(false);
  }

  if (!catalog || !backend) return <p className="text-muted">Chargement…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] items-end gap-4">
        <Label>1. Gamme (qualité)
          <NativeSelect value={activeProductId} onChange={(e) => setProductId(e.target.value)}>
            {catalog.products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </NativeSelect>
        </Label>
        {backend === "cloudinary" ? (
          <p className="m-0 flex min-h-12 items-center text-[15px] text-soft">
            Photos gardées en pleine résolution. Le site affiche automatiquement une version adaptée à chaque écran.
          </p>
        ) : (
          <label className="flex min-h-12 items-center gap-3 text-[15px]">
            <input type="checkbox" checked={compress} onChange={(e) => setCompress(e.target.checked)} className="size-[22px] flex-none accent-cta" />
            Compresser en WebP, 1200 × 1200 px max
          </label>
        )}
      </div>

      <div
        className="flex flex-col items-center gap-3.5 rounded-[20px] border-2 border-dashed border-line-strong bg-card px-5 py-[clamp(24px,6vw,40px)] text-center hover:border-red-text"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <Upload aria-hidden className="size-10 text-red-text" strokeWidth={1.8} />
        <strong className="font-display text-xl">2. Déposez vos photos ici</strong>
        <span className="max-w-[520px] text-[15px] text-soft">
          Nommez chaque fichier <code className="rounded-md bg-navy-deep px-1.5 py-0.5 text-white">marque_modele_couleur_N.jpg</code>, par exemple{" "}
          <code className="rounded-md bg-navy-deep px-1.5 py-0.5 text-white">samsung_galaxy-a15_noir_1.jpg</code>. Majuscules, espaces et tirets sont ignorés.
        </span>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button asChild variant="secondary">
            <label className="cursor-pointer">
              Choisir des photos
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </Button>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              Prendre une photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="ok">{ready.length} prête{ready.length > 1 ? "s" : ""}</Badge>
              {toFix.length > 0 && <Badge variant="bad">{toFix.length} à corriger</Badge>}
              {done > 0 && <Badge variant="info">{done} importée{done > 1 ? "s" : ""}</Badge>}
            </div>
            <span className="text-sm text-muted">3. Vérifiez avant d&apos;importer</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {rows.map((r) => {
              const ok = isOk(r);
              const model = catalog.models.find((m) => m._id === r.modelId);
              const color = catalog.colors.find((c) => c._id === r.colorId);
              const modelLabel = r.modelId === "new" ? `${brandName.get(r.brandId!)} · ${titleCase(r.parsedModel!)} (nouveau)` : model ? `${brandName.get(model.brandId)} · ${model.name}` : "?";
              return (
                <li key={r.key} className={cn("grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3.5 rounded-2xl border-[1.5px] bg-card p-3 md:grid-cols-[56px_minmax(0,1fr)_minmax(240px,320px)]", ok || r.state !== "ready" ? "border-line" : "border-red-text")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt="" className="size-14 rounded-xl bg-navy object-cover" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-mono text-[13px] text-muted">{r.file.name}</span>
                    <strong className="text-[15px]">{modelLabel} · {color?.name ?? "?"} · photo {r.position}</strong>
                    <span className={cn("text-[13px]", r.state === "error" ? "text-red-text" : ok ? "text-muted" : "text-red-text")}>
                      {r.state === "done" ? "Importée" : r.state === "uploading" ? "Envoi…" : r.state === "error" ? r.error : ok ? "Reconnue" : !r.modelId ? `Modèle « ${r.parsedModel ?? r.file.name} » introuvable` : "Couleur introuvable"}
                    </span>
                  </div>
                  {r.state === "ready" && (
                    <div className="col-span-full grid grid-cols-[1fr_1fr_64px] gap-2 md:col-span-1">
                      <label className="sr-only" htmlFor={`m-${r.key}`}>Modèle pour {r.file.name}</label>
                      <NativeSelect id={`m-${r.key}`} value={r.modelId} onChange={(e) => update(r.key, { modelId: e.target.value })} className={cn("min-h-11 py-2 text-[15px]", !r.modelId && "border-red-text")}>
                        <option value="">Modèle…</option>
                        {r.brandId && r.parsedModel && <option value="new">Créer « {titleCase(r.parsedModel)} »</option>}
                        {catalog.brands.map((b) => (
                          <optgroup key={b._id} label={b.name}>
                            {catalog.models.filter((m) => m.brandId === b._id).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                          </optgroup>
                        ))}
                      </NativeSelect>
                      <label className="sr-only" htmlFor={`c-${r.key}`}>Couleur pour {r.file.name}</label>
                      <NativeSelect id={`c-${r.key}`} value={r.colorId} onChange={(e) => update(r.key, { colorId: e.target.value })} className={cn("min-h-11 py-2 text-[15px]", !r.colorId && "border-red-text")}>
                        <option value="">Couleur…</option>
                        {catalog.colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </NativeSelect>
                      <label className="sr-only" htmlFor={`p-${r.key}`}>Numéro de photo</label>
                      <NativeSelect id={`p-${r.key}`} value={r.position} onChange={(e) => update(r.key, { position: Number(e.target.value) })} className="min-h-11 px-2 py-2 text-[15px]">
                        {Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                      </NativeSelect>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={busy || ready.length === 0} onClick={upload}>
              {busy ? "Import en cours…" : `Importer ${ready.length} photo${ready.length > 1 ? "s" : ""}`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setRows([])}>Vider la liste</Button>
            <span className="text-sm text-muted">{toFix.length ? "Les photos à corriger seront ignorées." : "Une photo au même numéro remplace l'ancienne."}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/[-\s]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
