"use client";

import {
  ADJUSTMENT_DIRECTION_LABELS,
  ADJUSTMENT_DIRECTIONS,
  MATERIAL_UNIT_SHORT_LABELS,
} from "@/constants/material";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/client";
import { todayIsoDate } from "@/lib/labour/money";
import { shouldShowMaterialLoadingState } from "@/lib/materials/transaction-dialog-state";
import {
  calculateLineCostPaise,
  formatMaterialCost,
  formatMilli,
  formatPaise,
  formatQuantityWithUnit,
  parseMoneyToPaise,
  parseQuantityToMilli,
} from "@/lib/materials/stock";
import { showToast } from "@/lib/toast";
import type { AdjustmentDirection, Material, Vendor } from "@/types";
import { Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

export type TransactionMode = "receive" | "use" | "return" | "adjust";

const TITLES: Record<TransactionMode, string> = {
  receive: "Receive material",
  use: "Record usage",
  return: "Return material",
  adjust: "Adjust stock",
};

function buildReceiveReferenceNumber(material: Material): string {
  const nameSlug = material.name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);

  const materialPart =
    nameSlug || material.category.replace(/_/g, "-").toUpperCase();
  const datePart = todayIsoDate().replace(/-/g, "");
  const idPart = material.id.replace(/-/g, "").slice(0, 4).toUpperCase();

  return `RCV-${materialPart}-${datePart}-${idPart}`;
}

export function MaterialTransactionDialog({
  projectId,
  mode,
  materials,
  open,
  onClose,
  onSaved,
  defaultMaterialId,
  stockByMaterialId = {},
  materialsLoading = false,
}: {
  projectId: string;
  mode: TransactionMode;
  materials: Material[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultMaterialId?: string;
  /** Current and minimum stock on this project, keyed by material id. */
  stockByMaterialId?: Record<
    string,
    { current: string; minimum: string | null }
  >;
  materialsLoading?: boolean;
}) {
  const [materialId, setMaterialId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("increase");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const selected = materials.find((material) => material.id === materialId);
  const waitingForMaterial = shouldShowMaterialLoadingState({
    materialsLoading,
    defaultMaterialId,
    materialCount: materials.length,
    mode,
  });

  const availableStockLabel = useMemo(() => {
    if (!selected || (mode !== "receive" && mode !== "use")) {
      return null;
    }

    const stock = stockByMaterialId[selected.id];
    const current = formatQuantityWithUnit(
      stock?.current ?? "0",
      selected.unit,
    );
    const minimumRaw = stock?.minimum ?? selected.minimum_stock;
    if (minimumRaw == null || minimumRaw === "") {
      return current;
    }

    const minimum = formatQuantityWithUnit(minimumRaw, selected.unit);
    return `${current} (min ${minimum})`;
  }, [mode, selected, stockByMaterialId]);

  const quantityLimit = useMemo(() => {
    if (!selected || (mode !== "receive" && mode !== "use")) {
      return null;
    }

    const stock = stockByMaterialId[selected.id];
    const minimumRaw = stock?.minimum ?? selected.minimum_stock;
    const minimumMilli =
      minimumRaw == null || minimumRaw === ""
        ? null
        : parseQuantityToMilli(minimumRaw);
    const availableMilli = parseQuantityToMilli(stock?.current ?? "0") ?? 0;

    if (mode === "use") {
      // Cannot use more than on hand, and not more than minimum stock when set.
      if (minimumMilli != null && minimumMilli > 0) {
        return Math.min(availableMilli, minimumMilli);
      }
      return availableMilli;
    }

    // Receive: do not enter more than minimum stock when configured.
    if (minimumMilli != null && minimumMilli > 0) {
      return minimumMilli;
    }

    return null;
  }, [mode, selected, stockByMaterialId]);

  const quantityMaxLabel = useMemo(() => {
    if (quantityLimit == null || !selected) {
      return null;
    }
    return formatQuantityWithUnit(formatMilli(quantityLimit), selected.unit);
  }, [quantityLimit, selected]);

  const vendorName = useMemo(() => {
    if (!vendorId) {
      return null;
    }
    return vendors.find((vendor) => vendor.id === vendorId)?.name ?? null;
  }, [vendorId, vendors]);

  function onQuantityChange(raw: string) {
    if (quantityLimit == null) {
      setQuantity(raw);
      return;
    }

    const parsed = parseQuantityToMilli(raw);
    if (parsed == null) {
      setQuantity(raw);
      return;
    }

    if (parsed > quantityLimit) {
      setQuantity(formatMilli(quantityLimit));
      return;
    }

    setQuantity(raw);
  }

  // Reset form when the dialog opens or the default material changes.
  // Do not depend on onClose — parent often passes an inline callback.
  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setMaterialId(defaultMaterialId ?? "");
    setVendorId("");
    setQuantity("");
    setUnitPrice("");
    setDate(todayIsoDate());
    setReference("");
    setNotes("");
    setDirection("increase");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, defaultMaterialId, mode]);

  useEffect(() => {
    if (!open || (mode !== "receive" && mode !== "use")) {
      return;
    }

    let cancelled = false;
    setVendorsLoading(true);

    void requestJson<{ vendors: Vendor[] }>("/api/vendors/active", {
      notify: false,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setVendors(result.data.vendors);
      }
      setVendorsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  // Keep catalog vendor locked in once the selected material is known.
  useEffect(() => {
    if (!open || (mode !== "receive" && mode !== "use")) {
      return;
    }
    if (!selected) {
      return;
    }

    setVendorId(selected.vendor_id ?? "");
  }, [open, mode, selected?.id, selected?.vendor_id]);

  useEffect(() => {
    if (!open || (mode !== "receive" && mode !== "use")) {
      return;
    }
    if (quantityLimit == null || !quantity) {
      return;
    }

    const parsed = parseQuantityToMilli(quantity);
    if (parsed != null && parsed > quantityLimit) {
      setQuantity(formatMilli(quantityLimit));
    }
  }, [open, mode, quantity, quantityLimit]);

  useEffect(() => {
    if (!open || mode !== "receive") {
      return;
    }

    if (!selected) {
      setReference("");
      return;
    }

    setReference(buildReceiveReferenceNumber(selected));
  }, [open, mode, selected]);

  useEffect(() => {
    if (!open || mode !== "receive" || !selected) {
      return;
    }
    setUnitPrice(
      selected.default_unit_price == null || selected.default_unit_price === ""
        ? ""
        : String(selected.default_unit_price),
    );
  }, [open, mode, selected]);

  const totalLabel = useMemo(() => {
    const qty = parseQuantityToMilli(quantity);
    const price = parseMoneyToPaise(unitPrice);
    if (qty === null || price === null) return null;
    return formatMaterialCost(formatPaise(calculateLineCostPaise(qty, price)));
  }, [quantity, unitPrice]);

  if (!open) return null;

  function endpoint() {
    if (mode === "receive") return "receive";
    if (mode === "use") return "use";
    if (mode === "return") return "return";
    return "adjust";
  }

  function body() {
    const shared = {
      material_id: materialId,
      quantity: String(quantity).trim(),
      transaction_date: date,
      notes,
    };

    if (mode === "receive") {
      return {
        ...shared,
        vendor_id: vendorId,
        unit_price: String(unitPrice).trim(),
        reference_number: reference,
      };
    }

    if (mode === "use") {
      return {
        ...shared,
        vendor_id: vendorId,
      };
    }

    if (mode === "adjust") {
      return {
        ...shared,
        adjustment_direction: direction,
      };
    }

    return shared;
  }

  function submit() {
    setError(null);

    if ((mode === "receive" || mode === "use") && quantityLimit != null) {
      const qtyMilli = parseQuantityToMilli(quantity);
      if (qtyMilli == null || qtyMilli <= 0) {
        setError("Enter a valid quantity.");
        return;
      }
      if (qtyMilli > quantityLimit) {
        setError(
          mode === "use"
            ? `Quantity cannot exceed available stock${quantityMaxLabel ? ` (${quantityMaxLabel})` : ""}.`
            : `Quantity cannot exceed minimum stock${quantityMaxLabel ? ` (${quantityMaxLabel})` : ""}.`,
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/materials/${endpoint()}`,
        {
          method: "POST",
          body: JSON.stringify(body()),
          notify: false,
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      onSaved();
      onClose();
    });
  }

  const showVendorField = mode === "receive" || mode === "use";

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
        aria-labelledby="txn-title"
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-5 shadow-lg sm:max-w-lg sm:rounded-xl"
      >
        <h2 id="txn-title" className="text-base font-semibold text-stone-900">
          {TITLES[mode]}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="txn-material">Material</Label>
            {waitingForMaterial ? (
              <p className="mt-1.5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-500">
                Loading materials…
              </p>
            ) : materials.length === 0 ? (
              <p className="mt-1.5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-500">
                {mode === "receive"
                  ? "No materials waiting for receipt."
                  : "No materials available."}
              </p>
            ) : (
              <Select
                id="txn-material"
                className="h-12 sm:h-10"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">Select material</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({MATERIAL_UNIT_SHORT_LABELS[material.unit]}
                    )
                  </option>
                ))}
              </Select>
            )}
            {availableStockLabel ? (
              <p className="mt-1.5 text-sm text-stone-600">
                Available stock: {availableStockLabel}
              </p>
            ) : null}
          </div>

          {showVendorField ? (
            <div>
              <Label htmlFor="txn-vendor">Vendor</Label>
              {vendorsLoading ? (
                <p className="mt-1.5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-500">
                  Loading vendor…
                </p>
              ) : (
                <p
                  id="txn-vendor"
                  className="mt-1.5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-800"
                >
                  {vendorName ?? "No vendor"}
                </p>
              )}
              <p className="mt-1 text-xs text-stone-500">
                Vendor comes from the material catalog and cannot be changed
                here.
              </p>
            </div>
          ) : null}

          {mode === "adjust" ? (
            <div>
              <Label htmlFor="txn-direction">Adjustment type</Label>
              <Select
                id="txn-direction"
                className="h-12 sm:h-10"
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as AdjustmentDirection)
                }
              >
                {ADJUSTMENT_DIRECTIONS.map((value) => (
                  <option key={value} value={value}>
                    {ADJUSTMENT_DIRECTION_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div>
            <Label htmlFor="txn-qty">Quantity</Label>
            <Input
              id="txn-qty"
              type="number"
              min="0"
              max={
                quantityLimit != null ? formatMilli(quantityLimit) : undefined
              }
              step="0.001"
              inputMode="decimal"
              className="h-12 sm:h-10"
              value={quantity}
              onChange={(event) => onQuantityChange(event.target.value)}
              disabled={waitingForMaterial}
            />
            {quantityMaxLabel ? (
              <p className="mt-1 text-xs text-stone-500">
                {mode === "use"
                  ? `Max ${quantityMaxLabel} (available / minimum stock).`
                  : `Max ${quantityMaxLabel} (minimum stock).`}
              </p>
            ) : null}
          </div>

          {mode === "receive" ? (
            <>
              <div>
                <Label htmlFor="txn-price">Unit price (₹)</Label>
                <Input
                  id="txn-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="h-12 sm:h-10"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  disabled={waitingForMaterial}
                />
              </div>
              <p className="text-sm text-stone-600">
                Total: {totalLabel ?? "—"}
              </p>
              <div>
                <Label htmlFor="txn-ref">Reference number</Label>
                <Input
                  id="txn-ref"
                  className="h-12 sm:h-10"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  disabled={waitingForMaterial}
                />
                <p className="mt-1 text-xs text-stone-500">
                  Auto-generated from the selected material. You can edit it
                  before saving.
                </p>
              </div>
            </>
          ) : null}

          <div>
            <Label htmlFor="txn-date">Date</Label>
            <Input
              id="txn-date"
              type="date"
              className="h-12 sm:h-10"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="txn-notes">
              {mode === "adjust" ? "Reason" : "Notes"}
            </Label>
            <Textarea
              id="txn-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

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
            disabled={
              isPending ||
              !materialId ||
              !quantity ||
              waitingForMaterial ||
              (showVendorField && vendorsLoading)
            }
            className="h-12 sm:h-10"
            icon={Save}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
