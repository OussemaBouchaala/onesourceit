"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CSV_COLUMNS, CSV_TEMPLATE, norm, parseCsv } from "@/lib/import";

type ImportRow = {
  line: number; range: string; brand: string; model: string; color: string;
  hex?: string; retail?: string; wholesale?: string; stock?: string;
};
type Result = { line: number; result: string; kind: "new" | "update" | "error" };

export function CsvImport() {
  const importCatalog = useMutation(api.admin.importCatalog);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setApplied(false);
    const table = parseCsv(await file.text());
    const header = (table.shift() ?? []).map(norm);
    const idx = Object.fromEntries(CSV_COLUMNS.map((c) => [c, header.indexOf(norm(c))]));
    const missing = ["gamme", "marque", "modele", "couleur"].filter((c) => idx[c] < 0);
    if (missing.length) {
      setRows(null);
      setError(`Colonnes manquantes : ${missing.join(", ")}. Utilisez le modèle CSV.`);
      return;
    }
    const get = (r: string[], c: string) => (idx[c] >= 0 ? r[idx[c]]?.trim() : undefined);
    const parsed = table.map((r, i) => ({
      line: i + 2,
      range: get(r, "gamme") ?? "",
      brand: get(r, "marque") ?? "",
      model: get(r, "modele") ?? "",
      color: get(r, "couleur") ?? "",
      hex: get(r, "code_couleur") || undefined,
      retail: get(r, "prix_detail"),
      wholesale: get(r, "prix_gros"),
      stock: get(r, "stock"),
    }));
    setRows(parsed);
    setBusy(true);
    try {
      setResults(await importCatalog({ rows: parsed, dryRun: true }));
    } catch (e) {
      setError(String((e as { data?: string })?.data ?? (e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!rows || !results) return;
    const okLines = new Set(results.filter((r) => r.kind !== "error").map((r) => r.line));
    setBusy(true);
    try {
      setResults(await importCatalog({ rows: rows.filter((r) => okLines.has(r.line)), dryRun: false }));
      setApplied(true);
    } catch (e) {
      setError(String((e as { data?: string })?.data ?? (e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const count = (k: Result["kind"]) => results?.filter((r) => r.kind === k).length ?? 0;
  const okCount = count("new") + count("update");
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-[clamp(16px,4vw,24px)]">
        <strong className="font-display text-lg">1. Préparez le fichier</strong>
        <span className="text-[15px] text-soft">Une ligne par modèle et couleur. Excel ou Google Sheets → Enregistrer en CSV. Une cellule de prix vide ne change pas le prix actuel ; « XX » le remet à « [XX] DT ».</span>
        <code className="block overflow-x-auto rounded-xl bg-navy-deep px-3.5 py-3 text-[13px] whitespace-nowrap">{CSV_COLUMNS.join(";")}</code>
        <a href={templateHref} download="modele-catalogue.csv" className="font-semibold text-red-text">Télécharger le modèle CSV</a>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-line-strong bg-card px-5 py-7 text-center">
        <strong className="font-display text-xl">2. Déposez le fichier CSV</strong>
        <Button asChild variant="secondary">
          <label className="cursor-pointer">
            Choisir un fichier
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </Button>
      </div>

      {error && <p role="alert" className="m-0 rounded-xl bg-bad-soft px-3.5 py-3 text-sm text-bad-ink">{error}</p>}

      {rows && results && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {applied && <Badge variant="ok">Import terminé</Badge>}
            <Badge variant="info">{count("new")} avec nouveautés</Badge>
            <Badge variant="ok">{count("update")} mises à jour</Badge>
            {count("error") > 0 && <Badge variant="bad">{count("error")} erreur{count("error") > 1 ? "s" : ""}</Badge>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ligne</TableHead><TableHead>Gamme</TableHead><TableHead>Modèle</TableHead><TableHead>Couleur</TableHead>
                <TableHead>Détail</TableHead><TableHead>Gros</TableHead><TableHead>Stock</TableHead><TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const res = results.find((x) => x.line === r.line);
                return (
                  <TableRow key={r.line}>
                    <TableCell>{r.line}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.range}</TableCell>
                    <TableCell className="whitespace-nowrap"><strong>{r.brand} {r.model}</strong></TableCell>
                    <TableCell className="whitespace-nowrap">{r.color}</TableCell>
                    <TableCell>{r.retail || "—"}</TableCell>
                    <TableCell>{r.wholesale || "—"}</TableCell>
                    <TableCell>{r.stock || "—"}</TableCell>
                    <TableCell>{res && <Badge variant={res.kind === "error" ? "bad" : res.kind === "new" ? "info" : "ok"}>{res.result}</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!applied && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={busy || okCount === 0} onClick={apply}>Appliquer {okCount} ligne{okCount > 1 ? "s" : ""}</Button>
              {count("error") > 0 && <span className="text-sm text-muted">Les lignes en erreur sont ignorées. Corrigez-les dans le fichier puis réimportez.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
