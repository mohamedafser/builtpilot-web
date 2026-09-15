"use client";

import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import type { ClientPortalPhoto } from "@/lib/client-portal/types";
import { formatDate, formatTimestamp } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function ClientPortalPhotoGallery({
  photos,
}: {
  photos: ClientPortalPhoto[];
}) {
  const { isOpen, open, close } = useDisclosure();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = photos[activeIndex] ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }

      if (event.key === "ArrowRight" && photos.length > 0) {
        setActiveIndex((current) => (current + 1) % photos.length);
      }

      if (event.key === "ArrowLeft" && photos.length > 0) {
        setActiveIndex(
          (current) => (current - 1 + photos.length) % photos.length,
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, photos.length]);

  if (photos.length === 0) {
    return (
      <ClientPortalEmptyState
        title="No project photos have been shared yet."
        description="Photos from the site will appear here."
      />
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                  alt={photo.caption || "Project photo"}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center px-3 text-center text-sm text-stone-500">
                  Photo unavailable
                </div>
              )}
              <div className="space-y-0.5 px-2 py-1.5">
                {photo.caption ? (
                  <p className="truncate text-xs text-stone-700">
                    {photo.caption}
                  </p>
                ) : null}
                <p className="text-xs text-stone-500">
                  {photo.report_date
                    ? formatDate(photo.report_date)
                    : formatTimestamp(photo.created_at)}
                </p>
              </div>
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
            aria-labelledby="client-portal-photo-title"
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
          >
            {active.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.signed_url}
                alt={active.caption || "Project photo"}
                className="max-h-[70vh] w-full bg-stone-950 object-contain"
              />
            ) : null}
            <div className="space-y-2 p-4">
              <h2
                id="client-portal-photo-title"
                className="text-base font-semibold text-stone-900"
              >
                {active.caption || "Project photo"}
              </h2>
              <p className="text-sm text-stone-600">
                {active.report_date
                  ? formatDate(active.report_date)
                  : formatTimestamp(active.created_at)}
              </p>
              <div className="flex justify-end">
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
