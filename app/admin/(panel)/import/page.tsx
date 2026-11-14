"use client";

import { useState } from "react";
import { PageTitle, Pill, PillRow } from "@/components/admin/page-title";
import { PhotoImport } from "@/components/admin/photo-import";
import { CsvImport } from "@/components/admin/csv-import";

export default function ImportPage() {
  const [mode, setMode] = useState<"photos" | "csv">("csv");
  return (
    <>
      <PageTitle title="Import en masse" subtitle="Pour ajouter beaucoup de modèles, prix ou photos d'un coup. Pour une seule photo, utilisez « Photos »." />
      <PillRow role="tablist" aria-label="Type d'import">
        <Pill role="tab" aria-selected={mode === "csv"} on={mode === "csv"} onClick={() => setMode("csv")}>Catalogue CSV</Pill>
        <Pill role="tab" aria-selected={mode === "photos"} on={mode === "photos"} onClick={() => setMode("photos")}>Photos (noms de fichiers)</Pill>
      </PillRow>
      {mode === "photos" ? <PhotoImport /> : <CsvImport />}
    </>
  );
}
