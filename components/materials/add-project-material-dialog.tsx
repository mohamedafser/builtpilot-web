"use client";

import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_UNIT_SHORT_LABELS,
} from "@/constants/material";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { Material } from "@/types";
import { Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

export function AddProjectMaterialDialog({
  projectId,
  open,
  onClose,
  onAdded,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [planned, setPlanned] = useState("");
  const [minimum, setMinimum] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setMaterialId("");
    setPlanned("");
    setMinimum("");
    setIsLoading(true);

    void requestJson<{ materials: Material[] }>(
      `/api/projects/${projectId}/materials/available`,
    ).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setMaterials([]);
        setIsLoading(false);
        return;
      }
      setMaterials(result.data.materials);
      setIsLoading(false);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, projectId]);

  if (!open) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/materials`,
        {
          method: "POST",
          body: JSON.stringify({
            material_id: materialId,
            planned_quantity: planned,
            minimum_stock: minimum,
          }),
          notify: false,
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      onAdded();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-material-title"
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-5 shadow-lg sm:max-w-lg sm:rounded-xl"
      >
        <h2 id="add-material-title" className="text-base font-semibold text-stone-900">
          Add material to project
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Choose an existing catalog material. Duplicates are blocked.
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-stone-500">Loading materials...</p>
        ) : materials.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            All active materials are already on this project, or none have been
            created yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="add-material-id">Material</Label>
              <Select
                id="add-material-id"
                className="h-12 sm:h-10"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">Select material</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} · {MATERIAL_CATEGORY_LABELS[material.category]}{" "}
                    ({MATERIAL_UNIT_SHORT_LABELS[material.unit]})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="add-planned">Planned quantity</Label>
              <Input
                id="add-planned"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                className="h-12 sm:h-10"
                value={planned}
                onChange={(event) => setPlanned(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="add-minimum">Project minimum stock</Label>
              <Input
                id="add-minimum"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                className="h-12 sm:h-10"
                value={minimum}
                onChange={(event) => setMinimum(event.target.value)}
              />
            </div>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            icon={X}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || isLoading || !materialId}
            className="h-12 sm:h-10"
            icon={Plus}
          >
            {isPending ? "Adding..." : "Add material"}
          </Button>
        </div>
      </div>
    </div>
  );
}
