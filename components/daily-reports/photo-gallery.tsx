"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { formatTimestamp } from "@/lib/utils";
import type { SitePhotoWithUrl } from "@/lib/daily-reports/types";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type PhotoGalleryProps = {
  projectId: string;
  reportId: string;
  photos: SitePhotoWithUrl[];
  canDelete?: boolean;
  onDeleted?: (photoId: string) => void;
};

export function PhotoGallery({
  projectId,
  reportId,
  photos,
  canDelete = true,
  onDeleted,
}: PhotoGalleryProps) {
  const { isOpen, open, close } = useDisclosure();
  const [activeIndex, setActiveIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = photos[activeIndex] ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          photos.length === 0 ? 0 : (current + 1) % photos.length,
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          photos.length === 0
            ? 0
            : (current - 1 + photos.length) % photos.length,
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, photos.length]);

  async function deletePhoto(photoId: string) {
    setError(null);
    setDeletingId(photoId);

    const result = await requestJson<{ id: string }>(
      `/api/projects/${projectId}/reports/${reportId}/photos/${photoId}`,
      { method: "DELETE" },
    );

    setDeletingId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (active?.id === photoId) {
      close();
    }

    onDeleted?.(photoId);
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        title="No site photos added yet."
        description="Attach photos from the site when you edit this report."
        className="py-10"
      />
    );
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              className="block w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-left"
              onClick={() => {
                setActiveIndex(index);
                open();
              }}
            >
              {photo.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.signed_url}
                  alt={photo.caption || photo.file_name}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center text-sm text-stone-500">
                  Photo unavailable
                </div>
              )}
              {photo.caption ? (
                <p className="truncate px-2 py-1.5 text-xs text-stone-600">
                  {photo.caption}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {isOpen && active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/70"
            aria-label="Close photo"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-photo-title"
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
          >
            {active.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.signed_url}
                alt={active.caption || active.file_name}
                className="max-h-[70vh] w-full bg-stone-950 object-contain"
              />
            ) : null}
            <div className="space-y-2 p-4">
              <h2
                id="site-photo-title"
                className="text-base font-semibold text-stone-900"
              >
                {active.caption || "Site photo"}
              </h2>
              <p className="text-sm text-stone-600">
                {formatTimestamp(active.created_at)}
                {active.uploaded_by_name ? ` · ${active.uploaded_by_name}` : ""}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {canDelete ? (
                  <Button
                    variant="danger"
                    disabled={deletingId === active.id}
                    onClick={() => void deletePhoto(active.id)}
                  >
                    {deletingId === active.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        Deleting...
                      </span>
                    ) : (
                      "Delete photo"
                    )}
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={close} icon={X}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
