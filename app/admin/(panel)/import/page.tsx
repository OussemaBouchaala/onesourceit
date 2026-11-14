"use client";

import { useState } from "react";
import { PageTitle, Pill } from "@/components/admin/page-title";
import { PhotoImport } from "@/components/admin/photo-import";
import { CsvImport } from "@/components/admin/csv-import";

export default function ImportPage() {
  const [mode, setMode] = useState<"photos" | "csv">("photos");
  return (
    <>
      <PageTitle title="Import" subtitle="Ajoutez des photos et des modèles en masse, sans saisie une par une." />
      <div role="tablist" aria-label="Type d'import" className="flex flex-wrap gap-2">
        <Pill role="tab" aria-selected={mode === "photos"} on={mode === "photos"} onClick={() => setMode("photos")}>Photos produits</Pill>
        <Pill role="tab" aria-selected={mode === "csv"} on={mode === "csv"} onClick={() => setMode("csv")}>Catalogue CSV</Pill>
      </div>
      {mode === "photos" ? <PhotoImport /> : <CsvImport />}
    </>
  );
}
