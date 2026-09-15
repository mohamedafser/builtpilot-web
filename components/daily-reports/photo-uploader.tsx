"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCEPTED_SITE_PHOTO_TYPES,
  MAX_SITE_PHOTO_BYTES,
  MAX_SITE_PHOTOS_PER_UPLOAD,
  SITE_PHOTO_ACCEPT,
} from "@/constants/daily-report";
import { compressImageFile } from "@/lib/daily-reports/compress-image";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
};

type PhotoUploaderProps = {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  disabled?: boolean;
  remainingSlots?: number;
};

const ALLOWED_TYPES = new Set<string>(ACCEPTED_SITE_PHOTO_TYPES);

function isAllowedImage(file: File): boolean {
  const type = file.type.toLowerCase();

  if (ALLOWED_TYPES.has(type) || type.startsWith("image/")) {
    if (type && !type.startsWith("image/")) {
      return false;
    }

    if (type && type.startsWith("image/") && type !== "image/svg+xml") {
      return (
        ALLOWED_TYPES.has(type) ||
        type === "image/heic" ||
        type === "image/heif"
      );
    }
  }

  const name = file.name.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].some((ext) =>
    name.endsWith(ext),
  );
}

export function PhotoUploader({
  photos,
  onChange,
  disabled = false,
  remainingSlots = MAX_SITE_PHOTOS_PER_UPLOAD,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) =>
        URL.revokeObjectURL(photo.previewUrl),
      );
    };
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || disabled) {
      return;
    }

    setLocalError(null);
    const incoming = Array.from(fileList);
    const available = Math.max(0, remainingSlots - photos.length);

    if (available <= 0) {
      setLocalError(
        `You can attach up to ${MAX_SITE_PHOTOS_PER_UPLOAD} photos.`,
      );
      return;
    }

    const selected = incoming.slice(0, available);
    setProcessing(true);

    const next: PendingPhoto[] = [];

    for (const file of selected) {
      if (!isAllowedImage(file)) {
        setLocalError("Use JPEG, PNG, WebP, or HEIC photos.");
        continue;
      }

      if (file.size > MAX_SITE_PHOTO_BYTES) {
        setLocalError("Each photo must be under 10 MB.");
        continue;
      }

      const compressed = await compressImageFile(file);

      if (compressed.size > MAX_SITE_PHOTO_BYTES) {
        setLocalError("Each photo must be under 10 MB after compression.");
        continue;
      }

      next.push({
        id: crypto.randomUUID(),
        file: compressed,
        previewUrl: URL.createObjectURL(compressed),
        caption: "",
      });
    }

    if (next.length > 0) {
      onChange([...photos, ...next]);
    }

    setProcessing(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function updateCaption(id: string, caption: string) {
    onChange(
      photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo)),
    );
  }

  function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id);

    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    onChange(photos.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="site-photos">Site photos</Label>
        <p className="mb-2 text-sm text-stone-500">
          Add JPEG, PNG, WebP, or HEIC photos. They upload when you save the
          report.
        </p>
        <input
          ref={inputRef}
          id="site-photos"
          type="file"
          accept={SITE_PHOTO_ACCEPT}
          multiple
          disabled={disabled || processing}
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-12 w-full sm:w-auto"
          disabled={
            disabled || processing || remainingSlots - photos.length <= 0
          }
          onClick={() => inputRef.current?.click()}
        >
          {processing ? "Preparing photos..." : "Add photos"}
        </Button>
      </div>

      {localError ? <p className="text-sm text-red-600">{localError}</p> : null}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={photo.caption || photo.file.name}
                className="h-32 w-full object-cover"
              />
              <div className="space-y-2 p-2">
                <Input
                  value={photo.caption}
                  placeholder="Caption (optional)"
                  className="h-10 text-base"
                  disabled={disabled}
                  onChange={(event) =>
                    updateCaption(photo.id, event.target.value)
                  }
                />
                <button
                  type="button"
                  className={cn(
                    "h-10 w-full rounded-md text-sm font-medium text-red-700 hover:bg-red-50",
                  )}
                  disabled={disabled}
                  onClick={() => removePhoto(photo.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
