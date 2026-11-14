"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toWebp } from "@/lib/import";

export type PhotoSlot = {
  productId: Id<"products">;
  modelId?: Id<"models">;
  colorId: Id<"colors">;
  position: number;
};

const CLOUDINARY_MAX_BYTES = 10_000_000; // Free plan limit per image

/**
 * Uploads one photo to its slot: straight to Cloudinary (full resolution,
 * server-signed) when configured, else to Convex storage as 1200 px WebP.
 */
export function usePhotoUpload() {
  const backend = useQuery(api.admin.photoBackend);
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl);
  const signPhotoUpload = useAction(api.admin.signPhotoUpload);
  const addPhoto = useMutation(api.admin.addPhoto);

  async function upload(slot: PhotoSlot, file: File, { compress = true } = {}) {
    if (backend === "cloudinary") {
      const body = file.size > CLOUDINARY_MAX_BYTES ? await toWebp(file, 4000, 0.9) : file;
      const { uploadUrl, fields } = await signPhotoUpload(slot);
      const form = new FormData();
      for (const [k, val] of Object.entries(fields)) form.append(k, String(val));
      form.append("file", body);
      const res = await fetch(uploadUrl, { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.public_id) throw new Error(json?.error?.message ?? "Envoi refusé");
      await addPhoto({ ...slot, publicId: json.public_id, version: json.version });
    } else {
      const blob = compress ? await toWebp(file) : file;
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      if (!res.ok) throw new Error("Envoi refusé");
      const { storageId } = await res.json();
      await addPhoto({ ...slot, storageId });
    }
  }

  return { backend, upload };
}
