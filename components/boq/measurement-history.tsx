"use client";

import { BoqMeasurementStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { BOQ_UNIT_SHORT_LABELS } from "@/constants/boq";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import type { BoqMeasurementListResult } from "@/lib/boq/types";
import { formatDate } from "@/lib/utils";
import { Ban, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BoqUnit } from "@/types";

export function MeasurementHistory({
  projectId,
  boqId,
  itemId,
  data,
  canVoid,
  onChanged,
}: {
  projectId: string;
  boqId: string;
  itemId: string;
  data: BoqMeasurementListResult;
  canVoid: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { isOpen, open, close } = useDisclosure();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startVoid(id: string) {
    setSelectedId(id);
    setError(null);
    open();
  }

  function confirmVoid() {
    if (!selectedId) {
      return;
    }

    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/boq/${boqId}/items/${itemId}/measurements/${selectedId}/void`,
        { method: "POST" },
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      close();
      onChanged?.();
      router.refresh();
    });
  }

  if (data.measurements.length === 0) {
    return (
      <p className="text-sm text-stone-500">No measurements recorded yet.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <ul className="divide-y divide-stone-100">
        {data.measurements.map((measurement) => (
          <li key={measurement.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">
                  {formatDate(measurement.measurement_date)}
                </p>
                <p className="mt-1 text-sm text-stone-700">
                  {measurement.quantity}{" "}
                  {BOQ_UNIT_SHORT_LABELS[measurement.unit as BoqUnit]}
                  {measurement.location ? ` · ${measurement.location}` : ""}
                </p>
                {measurement.description ? (
                  <p className="mt-1 text-sm text-stone-500">
                    {measurement.description}
                  </p>
                ) : null}
                {measurement.reference ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Ref: {measurement.reference}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <BoqMeasurementStatusBadge status={measurement.status} />
                {canVoid && measurement.status === "active" ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => startVoid(measurement.id)}
                    icon={Ban}
                  >
                    Void
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
      />

      {isOpen ? (
        <div className="fixed inset-0 z-50 m-0 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/40"
            aria-label="Close dialog"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2 className="text-base font-semibold text-stone-900">
              Void measurement
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Voided measurements stay in history but stop contributing to
              completed quantity. Add a corrected measurement afterwards if
              needed.
            </p>
            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={close}
                disabled={isPending}
                icon={X}
              >
                Close
              </Button>
              <Button
                variant="danger"
                onClick={confirmVoid}
                disabled={isPending}
                icon={Ban}
              >
                {isPending ? "Voiding..." : "Void measurement"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
