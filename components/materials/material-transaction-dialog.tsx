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

function unitPriceDisplay(material: Material | undefined): string {
  if (
    !material ||
    material.default_unit_price == null ||
    material.default_unit_price === ""
  ) {
    return "";
  }
  return String(material.default_unit_price);
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
  const isProjectTxn = mode === "receive" || mode === "use";

  const availableStockLabel = useMemo(() => {
    if (!selected || !isProjectTxn) {
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
  }, [isProjectTxn, selected, stockByMaterialId]);

  const quantityLimit = useMemo(() => {
    if (!selected || !isProjectTxn) {
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
      if (minimumMilli != null && minimumMilli > 0) {
        return Math.min(availableMilli, minimumMilli);
      }
      return availableMilli;
    }

    if (minimumMilli != null && minimumMilli > 0) {
      return minimumMilli;
    }

    return null;
  }, [isProjectTxn, mode, selected, stockByMaterialId]);

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
    if (!open || !isProjectTxn) {
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
  }, [open, isProjectTxn]);

  useEffect(() => {
    if (!open || !isProjectTxn || !selected) {
      return;
    }

    setVendorId(selected.vendor_id ?? "");
  }, [open, isProjectTxn, selected?.id, selected?.vendor_id]);

  useEffect(() => {
    if (!open || !isProjectTxn || quantityLimit == null || !quantity) {
      return;
    }

    const parsed = parseQuantityToMilli(quantity);
    if (parsed != null && parsed > quantityLimit) {
      setQuantity(formatMilli(quantityLimit));
    }
  }, [open, isProjectTxn, quantity, quantityLimit]);

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
    if (!open || !isProjectTxn) {
      return;
    }
    setUnitPrice(unitPriceDisplay(selected));
  }, [open, isProjectTxn, selected]);

  // Receive: always prefill Quantity with the Max value and keep it locked.
  useEffect(() => {
    if (!open || mode !== "receive") {
      return;
    }

    if (quantityLimit != null && quantityLimit > 0) {
      setQuantity(formatMilli(quantityLimit));
      return;
    }

    setQuantity("");
  }, [open, mode, quantityLimit, materialId]);

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

    let submitQuantity = String(quantity).trim();
    if (mode === "receive" && quantityLimit != null && quantityLimit > 0) {
      submitQuantity = formatMilli(quantityLimit);
      setQuantity(submitQuantity);
    }

    if (
      (mode === "receive" || mode === "use") &&
      !notes.trim()
    ) {
      setError("Notes are required.");
      return;
    }

    if (isProjectTxn && quantityLimit != null) {
      const qtyMilli = parseQuantityToMilli(
        mode === "receive" ? submitQuantity : quantity,
      );
      if (qtyMilli == null || qtyMilli <= 0) {
        setError("Enter a valid quantity.");
        return;
      }
      if (qtyMilli > quantityLimit) {
        setError(
          mode === "use"
            ? `Quantity cannot exceed available stock${quantityMaxLabel ? ` (${quantityMaxLabel})` : ""}.`
            : `Quantity cannot exceed maximum stock${quantityMaxLabel ? ` (${quantityMaxLabel})` : ""}.`,
        );
        return;
      }
    }

    startTransition(async () => {
      const payload =
        mode === "receive" && quantityLimit != null && quantityLimit > 0
          ? { ...body(), quantity: submitQuantity }
          : body();

      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/materials/${endpoint()}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
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

  const unitPriceLabel =
    unitPrice.trim() === "" ? "—" : formatMaterialCost(unitPrice);

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
        className={
          isProjectTxn
            ? "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-4 shadow-lg sm:max-w-lg sm:rounded-xl sm:p-4"
            : "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-5 shadow-lg sm:max-w-lg sm:rounded-xl"
        }
      >
        <h2
          id="txn-title"
          className={
            isProjectTxn
              ? "text-sm font-semibold text-stone-900"
              : "text-base font-semibold text-stone-900"
          }
        >
          {TITLES[mode]}
        </h2>

        <div className={isProjectTxn ? "mt-3 space-y-2.5" : "mt-4 space-y-4"}>
          {isProjectTxn ? (
            <>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="txn-material" className="text-xs">
                    Material
                  </Label>
                  {waitingForMaterial ? (
                    <p className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs text-stone-500">
                      Loading materials…
                    </p>
                  ) : materials.length === 0 ? (
                    <p className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs text-stone-500">
                      {mode === "receive"
                        ? "No materials waiting for receipt."
                        : "No materials available."}
                    </p>
                  ) : (
                    <Select
                      id="txn-material"
                      className="mt-1 h-9 text-sm"
                      value={materialId}
                      onChange={(event) => setMaterialId(event.target.value)}
                    >
                      <option value="">Select material</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} (
                          {MATERIAL_UNIT_SHORT_LABELS[material.unit]})
                        </option>
                      ))}
                    </Select>
                  )}
                  {availableStockLabel ? (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Available: {availableStockLabel}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="txn-vendor" className="text-xs">
                    Vendor
                  </Label>
                  {vendorsLoading ? (
                    <p className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs text-stone-500">
                      Loading vendor…
                    </p>
                  ) : (
                    <p
                      id="txn-vendor"
                      className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs font-medium text-stone-800"
                    >
                      {vendorName ?? "No vendor"}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-stone-500">
                    From material catalog (locked).
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="txn-qty" className="text-xs">
                    Quantity
                  </Label>
                  <Input
                    id="txn-qty"
                    type="number"
                    min="0"
                    max={
                      quantityLimit != null
                        ? formatMilli(quantityLimit)
                        : undefined
                    }
                    step="0.001"
                    inputMode="decimal"
                    className="mt-1 h-9 text-sm disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-800"
                    value={
                      mode === "receive" &&
                      quantityLimit != null &&
                      quantityLimit > 0
                        ? formatMilli(quantityLimit)
                        : quantity
                    }
                    onChange={(event) => onQuantityChange(event.target.value)}
                    disabled={waitingForMaterial || mode === "receive"}
                    readOnly={mode === "receive"}
                  />
                  {quantityMaxLabel ? (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Max {quantityMaxLabel}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="txn-price" className="text-xs">
                    Unit price (₹)
                  </Label>
                  <p
                    id="txn-price"
                    className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm font-medium text-stone-800 tabular-nums"
                  >
                    {unitPriceLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-stone-500">
                    Catalog price (locked).
                  </p>
                </div>

                {mode === "receive" ? (
                  <div>
                    <Label htmlFor="txn-ref" className="text-xs">
                      Reference
                    </Label>
                    <Input
                      id="txn-ref"
                      className="mt-1 h-9 text-sm"
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      disabled={waitingForMaterial}
                    />
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="txn-date" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="txn-date"
                    type="date"
                    className="mt-1 h-9 text-sm"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
              </div>

              {mode === "receive" ? (
                <p className="text-xs text-stone-600">
                  Total:{" "}
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {totalLabel ?? "—"}
                  </span>
                </p>
              ) : null}

              <div>
                <Label htmlFor="txn-notes" className="text-xs">
                  Notes
                  {mode === "receive" || mode === "use" ? (
                    <span className="text-red-600" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  ) : null}
                </Label>
                <Textarea
                  id="txn-notes"
                  rows={2}
                  className="mt-1 min-h-0 resize-y text-sm"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  required={mode === "receive" || mode === "use"}
                  aria-required={mode === "receive" || mode === "use"}
                  placeholder={
                    mode === "receive"
                      ? "Add a note for this receipt"
                      : mode === "use"
                        ? "Add a note for this usage"
                        : undefined
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="txn-material">Material</Label>
                <Select
                  id="txn-material"
                  className="h-12 sm:h-10"
                  value={materialId}
                  onChange={(event) => setMaterialId(event.target.value)}
                >
                  <option value="">Select material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} (
                      {MATERIAL_UNIT_SHORT_LABELS[material.unit]})
                    </option>
                  ))}
                </Select>
              </div>

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
                  step="0.001"
                  inputMode="decimal"
                  className="h-12 sm:h-10"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>

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
            </>
          )}
        </div>

        {error ? (
          <p className="mt-2 text-xs text-red-600 sm:text-sm">{error}</p>
        ) : null}

        <div
          className={
            isProjectTxn
              ? "mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
              : "mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          }
        >
          <Button
            variant="secondary"
            size={isProjectTxn ? "sm" : "md"}
            onClick={onClose}
            disabled={isPending}
            icon={X}
          >
            Cancel
          </Button>
          <Button
            size={isProjectTxn ? "sm" : "md"}
            onClick={submit}
            disabled={
              isPending ||
              !materialId ||
              !(
                quantity ||
                (mode === "receive" &&
                  quantityLimit != null &&
                  quantityLimit > 0)
              ) ||
              ((mode === "receive" || mode === "use") && !notes.trim()) ||
              waitingForMaterial ||
              (isProjectTxn && vendorsLoading)
            }
            className={isProjectTxn ? "h-9" : "h-12 sm:h-10"}
            icon={Save}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
