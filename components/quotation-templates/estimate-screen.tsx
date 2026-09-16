"use client";

import {
  CostDistributionChart,
  EstimateSummaryCards,
  FloorCostChart,
} from "@/components/quotation-templates/estimate-charts";
import { CompactPanel } from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { useLocale } from "@/lib/i18n/locale-context";
import { currencyForCountry } from "@/lib/i18n/config";
import { requestJson } from "@/lib/api/client";
import type { Project } from "@/types";
import {
  buildFloorRatesForCount,
  calculateTemplateQuotation,
  cloneTemplateDefinition,
  createBlankTemplate,
  definitionToSavePayload,
  estimateToQuotationFormValuesWithDiscount,
  type AreaBasis,
  type PlotAreaUnit,
  type QuotationQualityLevel,
  type QuotationTemplateDefinition,
  type QuotationTemplateSummary,
  type TemplateAddon,
  type TemplateCostLine,
  type TemplateFloorRate,
  type TemplateListItem,
  toSqFt,
} from "@/lib/quotation-templates";
import { roundArea } from "@/lib/quotation-templates/units";
import {
  AREA_BASIS_LABELS,
  AREA_BASIS_OPTIONS,
  PLOT_AREA_UNIT_LABELS,
  PLOT_AREA_UNITS,
  QUOTATION_QUALITY_LABELS,
  QUOTATION_TEMPLATE_DISCLAIMER,
  SQFT_PER_CENT,
} from "@/lib/quotation-templates/types";
import { DEFAULT_QUOTATION_VALIDITY_DAYS } from "@/constants/quotation";
import { formatLabourCost, todayIsoDate } from "@/lib/labour/money";
import { addDaysIso } from "@/lib/quotations/calculations";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

type ClearableNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number | "" | null | undefined;
  onValueChange: (value: number) => void;
  /** Committed value when the field is cleared (default 0). */
  emptyValue?: number;
};

/** Number input that can be fully cleared while editing instead of snapping to 0. */
function ClearableNumberInput({
  value,
  onValueChange,
  emptyValue = 0,
  min,
  max,
  onBlur,
  onFocus,
  ...props
}: ClearableNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const minValue = min == null || min === "" ? undefined : Number(min);
  const maxValue = max == null || max === "" ? undefined : Number(max);

  const display =
    draft !== null
      ? draft
      : value === "" || value == null
        ? ""
        : String(value);

  function clamp(next: number) {
    let result = next;
    if (Number.isFinite(minValue)) {
      result = Math.max(minValue as number, result);
    }
    if (Number.isFinite(maxValue)) {
      result = Math.min(maxValue as number, result);
    }
    return result;
  }

  function commitRaw(raw: string) {
    if (raw.trim() === "") {
      onValueChange(
        clamp(Number.isFinite(emptyValue) ? emptyValue : 0),
      );
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }
    onValueChange(clamp(parsed));
  }

  return (
    <Input
      type="number"
      value={display}
      min={min}
      max={max}
      onFocus={(event: FocusEvent<HTMLInputElement>) => {
        setDraft(value === "" || value == null ? "" : String(value));
        onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        // Keep empty while typing; commit emptyValue on blur so fields stay clearable.
        if (raw.trim() === "") {
          return;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          return;
        }
        onValueChange(clamp(parsed));
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        if (draft !== null) {
          commitRaw(draft);
        }
        setDraft(null);
        onBlur?.(event);
      }}
      {...props}
    />
  );
}

function CostLineEditor({
  title,
  lines,
  onChange,
  modified,
  currencyCode,
}: {
  title: string;
  lines: TemplateCostLine[];
  onChange: (lines: TemplateCostLine[]) => void;
  modified?: boolean;
  currencyCode: string;
}) {
  const { t, tParams } = useLocale();
  const sectionTotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
        0,
      ),
    [lines],
  );

  return (
    <CompactPanel
      title={title}
      action={
        <div className="flex items-center gap-2">
          {modified ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Modified
            </span>
          ) : null}
          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-800">
            {t("common.total")} {formatLabourCost(sectionTotal, currencyCode)}
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-stone-500">
            <tr>
              <th className="pb-2 pr-2 font-medium">Item</th>
              <th className="pb-2 pr-2 font-medium">Unit</th>
              <th className="pb-2 pr-2 font-medium">Qty</th>
              <th className="pb-2 pr-2 font-medium">Rate</th>
              <th className="pb-2 pr-2 font-medium">Est.</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-t border-stone-100">
                <td className="py-1.5 pr-2">
                  <Input
                    className="h-8 min-w-[8rem] text-xs"
                    value={line.name}
                    onChange={(event) => {
                      const next = [...lines];
                      next[index] = { ...line, name: event.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    className="h-8 w-16 text-xs"
                    value={line.unit}
                    onChange={(event) => {
                      const next = [...lines];
                      next[index] = { ...line, unit: event.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <ClearableNumberInput
                    min={0}
                    step="0.001"
                    className="h-8 w-20 text-xs"
                    value={line.quantity}
                    onValueChange={(quantity) => {
                      const next = [...lines];
                      next[index] = { ...line, quantity };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <ClearableNumberInput
                    min={0}
                    step="0.01"
                    className="h-8 w-24 text-xs"
                    value={line.unitPrice}
                    onValueChange={(unitPrice) => {
                      const next = [...lines];
                      next[index] = { ...line, unitPrice };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-1.5 pr-2 tabular-nums text-stone-700">
                  {formatLabourCost(line.quantity * line.unitPrice, currencyCode)}
                </td>
                <td className="py-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0 text-red-600"
                    aria-label={`Remove ${line.name}`}
                    onClick={() =>
                      onChange(lines.filter((item) => item.id !== line.id))
                    }
                    icon={Trash2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200">
              <td
                colSpan={4}
                className="pt-2 pr-2 text-right text-xs font-semibold text-stone-700"
              >
                {tParams("estimate.sectionTotal", { section: title })}
              </td>
              <td className="pt-2 pr-2 text-xs font-semibold tabular-nums text-stone-900">
                {formatLabourCost(sectionTotal, currencyCode)}
              </td>
              <td className="pt-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      {lines.length === 0 ? (
        <p className="mb-2 text-xs text-stone-500">
          {t("estimate.noItems")}
        </p>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        icon={Plus}
        onClick={() =>
          onChange([
            ...lines,
            {
              id: newId("line"),
              name: "New item",
              category: lines[0]?.category ?? "other",
              unit: "lot",
              quantity: 1,
              unitPrice: 0,
            },
          ])
        }
      >
        {t("estimate.addItem")}
      </Button>
    </CompactPanel>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  tone,
}: {
  title: string;
  items: TemplateListItem[];
  onChange: (items: TemplateListItem[]) => void;
  tone: "include" | "exclude";
}) {
  return (
    <CompactPanel title={title}>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold",
                tone === "include" ? "text-emerald-600" : "text-red-600",
              )}
            >
              {tone === "include" ? "✓" : "✕"}
            </span>
            <Input
              className="h-8 flex-1 text-xs"
              value={item.text}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, text: event.target.value };
                onChange(next);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0 text-red-600"
              aria-label="Remove item"
              onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              icon={Trash2}
            />
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        icon={Plus}
        onClick={() =>
          onChange([
            ...items,
            {
              id: newId(tone),
              text: tone === "include" ? "New included item" : "New excluded item",
              included: tone === "include",
            },
          ])
        }
      >
        Add
      </Button>
    </CompactPanel>
  );
}

export function QuotationEstimateScreen({
  projectId,
  defaultCountryCode,
  mode = "template",
}: {
  projectId?: string;
  defaultCountryCode?: string;
  mode?: "template" | "blank";
}) {
  const router = useRouter();
  const { currencyCode: workspaceCurrency, t, tParams } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [summaries, setSummaries] = useState<QuotationTemplateSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [countryCode, setCountryCode] = useState(
    (defaultCountryCode ?? "IN").toUpperCase(),
  );
  const [templateId, setTemplateId] = useState("");
  const [baseline, setBaseline] = useState<QuotationTemplateDefinition | null>(
    null,
  );
  const [qualityId, setQualityId] =
    useState<QuotationQualityLevel>("standard");
  const [areaBasis, setAreaBasis] = useState<AreaBasis>("built_up");
  const [plotAreaValue, setPlotAreaValue] = useState(1);
  const [plotAreaUnit, setPlotAreaUnit] = useState<PlotAreaUnit>("cent");
  const [sharedBuiltUpSqFt, setSharedBuiltUpSqFt] = useState(435.6);
  const [floorCount, setFloorCount] = useState(1);
  const [floorRates, setFloorRates] = useState<TemplateFloorRate[]>([]);
  const [floorAreas, setFloorAreas] = useState<
    Array<{ floor: number; builtUpSqFt: number }>
  >([{ floor: 0, builtUpSqFt: 435.6 }]);
  const [materials, setMaterials] = useState<TemplateCostLine[]>([]);
  const [labour, setLabour] = useState<TemplateCostLine[]>([]);
  const [otherCosts, setOtherCosts] = useState<TemplateCostLine[]>([]);
  const [includedItems, setIncludedItems] = useState<TemplateListItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<TemplateListItem[]>([]);
  const [addons, setAddons] = useState<
    Array<TemplateAddon & { selected: boolean }>
  >([]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [contingencyPercentage, setContingencyPercentage] = useState(5);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [pricingMode, setPricingMode] = useState<"turnkey" | "itemized">(
    "turnkey",
  );
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [quotationDate, setQuotationDate] = useState(todayIsoDate());
  const [validUntil, setValidUntil] = useState(
    addDaysIso(todayIsoDate(), DEFAULT_QUOTATION_VALIDITY_DAYS),
  );
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [saveName, setSaveName] = useState("");

  const currencyCode = useMemo(
    () =>
      String(
        baseline?.currencyCode ?? currencyForCountry(countryCode),
      ).toUpperCase(),
    [baseline?.currencyCode, countryCode],
  );

  const money = (value: string | number | null) =>
    formatLabourCost(value, currencyCode);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    void requestJson<{ project: Project }>(`/api/projects/${projectId}`).then(
      (result) => {
        if (cancelled || !result.ok) return;
        const project = result.data.project;
        setClientName((current) => current || project.client_name || "");
        setClientPhone((current) => current || project.client_phone || "");
        setClientEmail((current) => current || project.client_email || "");
        setClientAddress((current) => current || project.location || "");
        setTitle((current) =>
          current.includes("Residential Construction") ||
          current === "Blank quotation" ||
          !current
            ? `${project.name} quotation`
            : current,
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const applyTemplate = useCallback((template: QuotationTemplateDefinition) => {
    const cloned = cloneTemplateDefinition(template);
    const quality = cloned.defaultQualityId;
    const isUae = String(cloned.countryCode).toUpperCase() === "AE";
    const defaultBuiltUp = isUae ? 1000 : SQFT_PER_CENT;
    const rates = buildFloorRatesForCount(cloned, quality, 1);
    setBaseline(cloned);
    setTemplateId(cloned.id);
    setCountryCode(String(cloned.countryCode).toUpperCase());
    setQualityId(quality);
    setFloorCount(1);
    setFloorRates(rates);
    setSharedBuiltUpSqFt(defaultBuiltUp);
    setFloorAreas([{ floor: 0, builtUpSqFt: defaultBuiltUp }]);
    setMaterials(cloned.materials.map((line) => ({ ...line })));
    setLabour(cloned.labour.map((line) => ({ ...line })));
    setOtherCosts(cloned.otherCosts.map((line) => ({ ...line })));
    setIncludedItems(cloned.includedItems.map((item) => ({ ...item })));
    setExcludedItems(cloned.excludedItems.map((item) => ({ ...item })));
    setAddons(
      cloned.addons.map((addon) => ({
        ...addon,
        selected: Boolean(addon.selectedByDefault),
      })),
    );
    setTaxPercentage(cloned.defaultTaxPercentage);
    setContingencyPercentage(cloned.defaultContingencyPercentage);
    setDiscountPercentage(cloned.defaultDiscountPercentage);
    setNotes(cloned.defaultNotes);
    setTerms(cloned.defaultTerms);
    setTitle(cloned.name);
    setSaveName(`My ${cloned.name}`);
    if (isUae) {
      setPlotAreaUnit("sqft");
      setPlotAreaValue(1000);
    } else {
      setPlotAreaUnit("cent");
      setPlotAreaValue(1);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      if (mode === "blank") {
        applyTemplate(createBlankTemplate(countryCode));
        setSummaries([]);
        setIsLoading(false);
        return;
      }

      const list = await requestJson<{
        templates: QuotationTemplateSummary[];
        countryCode: string;
      }>(`/api/quotation-templates?country=${countryCode}`);

      if (cancelled) return;

      if (!list.ok) {
        setLoadError(list.message);
        setIsLoading(false);
        return;
      }

      setSummaries(list.data.templates);
      const preferred =
        list.data.templates.find((row) => row.countryCode === countryCode) ??
        list.data.templates[0];

      if (!preferred) {
        setIsLoading(false);
        return;
      }

      const detail = await requestJson<{
        template: QuotationTemplateDefinition;
      }>(`/api/quotation-templates/${encodeURIComponent(preferred.id)}`);

      if (cancelled) return;

      if (!detail.ok) {
        setLoadError(detail.message);
        setIsLoading(false);
        return;
      }

      applyTemplate(detail.data.template);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Reload when country or mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, mode]);

  async function loadTemplateById(id: string) {
    const detail = await requestJson<{
      template: QuotationTemplateDefinition;
    }>(`/api/quotation-templates/${encodeURIComponent(id)}`);

    if (!detail.ok) {
      showToast(detail.message, "error");
      return;
    }

    applyTemplate(detail.data.template);
  }

  function resetToDefault() {
    if (mode === "blank") {
      applyTemplate(createBlankTemplate(countryCode));
      showToast("Reset to blank quotation.", "success");
      return;
    }
    if (!baseline) return;
    applyTemplate(baseline);
    showToast("Reset to default template rates.", "success");
  }

  useEffect(() => {
    if (!baseline) return;
    setFloorRates((current) =>
      buildFloorRatesForCount(baseline, qualityId, floorCount, current),
    );
    setFloorAreas((current) => {
      const next = [];
      for (let floor = 0; floor < floorCount; floor += 1) {
        next.push({
          floor,
          builtUpSqFt:
            current.find((row) => row.floor === floor)?.builtUpSqFt ??
            sharedBuiltUpSqFt,
        });
      }
      return next;
    });
    // sharedBuiltUpSqFt is applied via plot/shared handlers so per-floor edits are kept
    // when only floor count / quality changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, floorCount, qualityId]);

  function syncBuiltUpAcrossFloors(builtUpSqFt: number) {
    const area = roundArea(Math.max(0, builtUpSqFt));
    setSharedBuiltUpSqFt(area);
    setFloorAreas((current) => {
      if (current.length === 0) {
        return [{ floor: 0, builtUpSqFt: area }];
      }
      return current.map((row) => ({ ...row, builtUpSqFt: area }));
    });
  }

  function builtUpFromPlotArea(value: number, unit: PlotAreaUnit) {
    return roundArea(toSqFt(Math.max(0, value), unit));
  }

  function onPlotAreaValueChange(value: number) {
    setPlotAreaValue(value);
    syncBuiltUpAcrossFloors(builtUpFromPlotArea(value, plotAreaUnit));
  }

  function onPlotAreaUnitChange(unit: PlotAreaUnit) {
    setPlotAreaUnit(unit);
    syncBuiltUpAcrossFloors(builtUpFromPlotArea(plotAreaValue, unit));
  }

  function onSharedBuiltUpChange(value: number) {
    syncBuiltUpAcrossFloors(value);
  }

  const estimate = useMemo(() => {
    if (!baseline) return null;
    return calculateTemplateQuotation({
      template: baseline,
      qualityId,
      areaBasis,
      plotAreaValue,
      plotAreaUnit,
      sharedBuiltUpSqFt,
      floorCount,
      floorRates,
      materials,
      labour,
      otherCosts,
      includedItems,
      excludedItems,
      addons,
      taxPercentage,
      contingencyPercentage,
      discountPercentage,
      pricingMode,
      floorAreas,
    });
  }, [
    addons,
    areaBasis,
    baseline,
    contingencyPercentage,
    discountPercentage,
    excludedItems,
    floorAreas,
    floorCount,
    floorRates,
    includedItems,
    labour,
    materials,
    otherCosts,
    plotAreaUnit,
    plotAreaValue,
    pricingMode,
    qualityId,
    sharedBuiltUpSqFt,
    taxPercentage,
  ]);

  const ratesModified = useMemo(() => {
    if (!baseline) return false;
    const defaults = buildFloorRatesForCount(baseline, qualityId, floorCount);
    return defaults.some((rate, index) => {
      const current = floorRates[index];
      return !current || current.ratePerSqFt !== rate.ratePerSqFt;
    });
  }, [baseline, floorCount, floorRates, qualityId]);

  const addonsSectionTotal = useMemo(
    () =>
      addons.reduce((sum, addon) => {
        if (!addon.selected) {
          return sum;
        }
        const amount = Number(addon.amount || 0);
        const rate = Number(addon.ratePerSqFt || 0);
        if (rate > 0 && estimate?.totalBuiltUpArea) {
          return sum + rate * estimate.totalBuiltUpArea;
        }
        return sum + amount;
      }, 0),
    [addons, estimate?.totalBuiltUpArea],
  );

  function saveQuotation() {
    if (!baseline || !estimate) return;

    if (!clientName.trim()) {
      showToast("Enter a client name before saving.", "error");
      return;
    }

    const formValues = estimateToQuotationFormValuesWithDiscount({
      template: baseline,
      estimate,
      title: title.trim() || `${baseline.name} estimate`,
      clientName: clientName.trim(),
      clientPhone,
      clientEmail,
      clientAddress,
      quotationDate,
      validUntil,
      notes,
      terms,
      projectId,
      discountPercentage,
      pricingMode,
    });

    const createPath = projectId
      ? `/api/projects/${projectId}/quotations`
      : "/api/quotations";

    startTransition(async () => {
      const result = await requestJson<{ id: string }>(createPath, {
        method: "POST",
        body: JSON.stringify({
          ...formValues,
          submit_action: "draft",
        }),
      });

      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }

      showToast(result.message, "success");
      router.push(`/quotations/${result.data.id}`);
      router.refresh();
    });
  }

  function saveAsMyTemplate() {
    if (!baseline || !saveName.trim()) {
      showToast("Enter a name for your template.", "error");
      return;
    }

    const working: QuotationTemplateDefinition = {
      ...baseline,
      materials,
      labour,
      otherCosts,
      includedItems,
      excludedItems,
      addons: addons.map(({ selected: _selected, ...addon }) => addon),
      defaultTaxPercentage: taxPercentage,
      defaultContingencyPercentage: contingencyPercentage,
      defaultDiscountPercentage: discountPercentage,
      defaultQualityId: qualityId,
      qualityLevels: baseline.qualityLevels.map((level) =>
        level.id === qualityId
          ? { ...level, floorRates: floorRates.map((rate) => ({ ...rate })) }
          : level,
      ),
    };

    const payload = definitionToSavePayload(working, saveName.trim());

    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        "/api/quotation-templates",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }

      showToast(result.message, "success");
      const list = await requestJson<{ templates: QuotationTemplateSummary[] }>(
        `/api/quotation-templates?country=${countryCode}`,
      );
      if (list.ok) {
        setSummaries(list.data.templates);
      }
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (loadError) {
    return <Alert variant="error">{loadError}</Alert>;
  }

  if (!baseline || !estimate) {
    return (
      <Alert variant="error">
        No quotation templates are available for this country yet.
      </Alert>
    );
  }

  const blankHref = projectId
    ? `/projects/${projectId}/quotations/new?mode=blank`
    : "/quotations/new?mode=blank";
  const templateHref = projectId
    ? `/projects/${projectId}/quotations/new`
    : "/quotations/new";
  const backHref = projectId
    ? `/projects/${projectId}/quotations`
    : "/quotations";
  const isBlank = mode === "blank";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {isBlank ? "Blank quotation" : "New quotation"}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {isBlank
              ? "Same fields as the default template — start empty and enter your own rates."
              : "Start from a country template, adjust rates, then save as a draft quotation."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isBlank ? (
            <Link
              href={templateHref}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={Sparkles}>Default template</WithIcon>
            </Link>
          ) : (
            <Link
              href={blankHref}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              Blank quotation
            </Link>
          )}
          <Link
            href={backHref}
            className={cn(linkButtonClassName("secondary", "sm"))}
          >
            <WithIcon icon={ArrowLeft}>Back</WithIcon>
          </Link>
        </div>
      </div>

      <CompactPanel title={isBlank ? "Setup" : "Template"}>
        <div
          className={cn(
            "grid gap-2",
            isBlank ? "sm:grid-cols-2" : "sm:grid-cols-3",
          )}
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Country
            </label>
            <Select
              className="h-9"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              <option value="IN">India (INR)</option>
              <option value="AE">UAE (AED)</option>
            </Select>
            <p className="mt-1 text-[11px] text-stone-500">
              Display currency: {currencyCode}
            </p>
          </div>
          {!isBlank ? (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-500">
                Template
              </label>
              <Select
                className="h-9"
                value={templateId}
                onChange={(event) => void loadTemplateById(event.target.value)}
              >
                {summaries.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.source === "custom" ? "My · " : ""}
                    {row.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Construction quality
            </label>
            <Select
              className="h-9"
              value={qualityId}
              onChange={(event) => {
                const next = event.target.value as QuotationQualityLevel;
                setQualityId(next);
                if (baseline) {
                  setFloorRates(
                    buildFloorRatesForCount(baseline, next, floorCount),
                  );
                }
              }}
            >
              {baseline.qualityLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {QUOTATION_QUALITY_LABELS[level.id] ?? level.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
          {isBlank
            ? "Blank quotation uses the same fields as the default template. Enter your own rates and line items. Amounts are shown in "
            : "Default quotation loaded. You can modify any rate before creating the quotation. Amounts are shown in "}
          {currencyCode}
          {workspaceCurrency !== currencyCode
            ? ` (workspace default is ${workspaceCurrency})`
            : ""}
          .
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={resetToDefault} icon={RotateCcw}>
            {isBlank ? "Reset blank" : "Reset to default"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPricingMode("turnkey")}
            className={pricingMode === "turnkey" ? "ring-2 ring-amber-400" : ""}
          >
            Turnkey package
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPricingMode("itemized")}
            className={pricingMode === "itemized" ? "ring-2 ring-amber-400" : ""}
          >
            Itemized costs
          </Button>
        </div>
      </CompactPanel>

      <CompactPanel title="Site & floors">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Calculate using
            </label>
            <Select
              className="h-9"
              value={areaBasis}
              onChange={(event) =>
                setAreaBasis(event.target.value as AreaBasis)
              }
            >
              {AREA_BASIS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {AREA_BASIS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Plot area
            </label>
            <div className="flex gap-1.5">
              <ClearableNumberInput
                min={0}
                step="0.001"
                className="h-9"
                value={plotAreaValue}
                onValueChange={onPlotAreaValueChange}
              />
              <Select
                className="h-9 w-24"
                value={plotAreaUnit}
                onChange={(event) =>
                  onPlotAreaUnitChange(event.target.value as PlotAreaUnit)
                }
              >
                {PLOT_AREA_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {PLOT_AREA_UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              1 cent = {SQFT_PER_CENT} sq.ft
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Built-up / floor (sq.ft)
            </label>
            <ClearableNumberInput
              min={0}
              step="0.001"
              className="h-9"
              value={sharedBuiltUpSqFt}
              onValueChange={onSharedBuiltUpChange}
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Auto-filled from plot area; edit to override per floor.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Floors
            </label>
            <ClearableNumberInput
              min={1}
              max={20}
              emptyValue={1}
              className="h-9"
              value={floorCount}
              onValueChange={setFloorCount}
            />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-stone-800">Floor rates</h4>
            {ratesModified ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Modified
              </span>
            ) : null}
          </div>
          {floorRates.map((rate, index) => (
            <div
              key={rate.floor}
              className="grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-2 sm:grid-cols-4"
            >
              <Input
                className="h-8 text-xs"
                value={rate.name}
                onChange={(event) => {
                  const next = [...floorRates];
                  next[index] = { ...rate, name: event.target.value };
                  setFloorRates(next);
                }}
              />
              <ClearableNumberInput
                min={0}
                className="h-8 text-xs"
                value={rate.ratePerSqFt}
                onValueChange={(ratePerSqFt) => {
                  const next = [...floorRates];
                  next[index] = { ...rate, ratePerSqFt };
                  setFloorRates(next);
                }}
              />
              <ClearableNumberInput
                min={0}
                className="h-8 text-xs"
                value={
                  floorAreas.find((row) => row.floor === rate.floor)
                    ?.builtUpSqFt ?? ""
                }
                placeholder="Floor sq.ft"
                onValueChange={(builtUpSqFt) => {
                  setFloorAreas((current) =>
                    current.map((row) =>
                      row.floor === rate.floor
                        ? { ...row, builtUpSqFt }
                        : row,
                    ),
                  );
                }}
              />
              <p className="flex items-center text-xs tabular-nums text-stone-600">
                {money(
                  estimate.floorCosts.find((row) => row.floor === rate.floor)
                    ?.amount ?? 0,
                )}
              </p>
            </div>
          ))}
          {ratesModified ? (
            <p className="text-[11px] text-stone-500">
              Default rates changed for this quality level. Reset to restore
              template values.
            </p>
          ) : null}
        </div>
      </CompactPanel>

      <EstimateSummaryCards estimate={estimate} currencyCode={currencyCode} />

      {estimate.isEstimateOnly ? (
        <Alert>
          Calculated using plot area — treat this as an estimated quotation
          until built-up areas are confirmed.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CompactPanel title="Cost distribution">
          <CostDistributionChart
            estimate={estimate}
            pricingMode={pricingMode}
            currencyCode={currencyCode}
          />
        </CompactPanel>
        <CompactPanel title="Floor cost">
          <FloorCostChart estimate={estimate} currencyCode={currencyCode} />
        </CompactPanel>
      </div>

      <CompactPanel title="Calculation">
        <ul className="space-y-1 text-sm text-stone-700">
          {estimate.floorCosts.map((floor) => (
            <li key={floor.floor} className="flex justify-between gap-3">
              <span>
                {floor.name}: {floor.areaSqFt} × {floor.ratePerSqFt}
              </span>
              <span className="font-medium tabular-nums">
                {money(floor.amount)}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-t border-stone-100 pt-1 font-semibold">
            <span>Construction</span>
            <span className="tabular-nums">
              {money(estimate.constructionCost)}
            </span>
          </li>
          {pricingMode === "itemized" ? (
            <>
              <li className="flex justify-between gap-3">
                <span>Materials</span>
                <span className="tabular-nums">
                  {money(estimate.materialCost)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Labour</span>
                <span className="tabular-nums">
                  {money(estimate.labourCost)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Other</span>
                <span className="tabular-nums">
                  {money(estimate.otherCost)}
                </span>
              </li>
            </>
          ) : (
            <li className="text-xs text-stone-500">
              Materials and labour below are indicative breakdowns inside the
              turnkey package rate and are not added again.
            </li>
          )}
          <li className="flex justify-between gap-3">
            <span>Add-ons</span>
            <span className="tabular-nums">{money(estimate.addonCost)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Contingency ({contingencyPercentage}%)</span>
            <span className="tabular-nums">
              {money(estimate.contingencyAmount)}
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Discount ({discountPercentage}%)</span>
            <span className="tabular-nums">
              −{money(estimate.discountAmount)}
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Tax ({taxPercentage}%)</span>
            <span className="tabular-nums">{money(estimate.taxAmount)}</span>
          </li>
          <li className="flex justify-between gap-3 border-t border-stone-200 pt-1 text-base font-semibold text-stone-900">
            <span>Grand total</span>
            <span className="tabular-nums">{money(estimate.grandTotal)}</span>
          </li>
        </ul>
      </CompactPanel>

      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-stone-500">
            Tax %
          </label>
          <ClearableNumberInput
            min={0}
            className="h-9"
            value={taxPercentage}
            onValueChange={setTaxPercentage}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-stone-500">
            Contingency %
          </label>
          <ClearableNumberInput
            min={0}
            className="h-9"
            value={contingencyPercentage}
            onValueChange={setContingencyPercentage}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-stone-500">
            Discount %
          </label>
          <ClearableNumberInput
            min={0}
            max={100}
            className="h-9"
            value={discountPercentage}
            onValueChange={setDiscountPercentage}
          />
        </div>
      </div>

      <CostLineEditor
        title={t("estimate.materials")}
        lines={materials}
        onChange={setMaterials}
        currencyCode={currencyCode}
      />
      <CostLineEditor
        title={t("estimate.labour")}
        lines={labour}
        onChange={setLabour}
        currencyCode={currencyCode}
      />
      <CostLineEditor
        title={t("estimate.otherCosts")}
        lines={otherCosts}
        onChange={setOtherCosts}
        currencyCode={currencyCode}
      />

      <CompactPanel
        title={t("estimate.addons")}
        action={
          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-800">
            {t("common.total")}{" "}
            {formatLabourCost(addonsSectionTotal, currencyCode)}
          </span>
        }
      >
        {addons.length === 0 ? (
          <p className="mb-2 text-xs text-stone-500">
            {t("estimate.noAddons")}
          </p>
        ) : null}
        <ul className="space-y-2">
          {addons.map((addon, index) => (
            <li
              key={addon.id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={addon.selected}
                onChange={(event) => {
                  const next = [...addons];
                  next[index] = { ...addon, selected: event.target.checked };
                  setAddons(next);
                }}
              />
              <Input
                className="h-8 min-w-[8rem] flex-1 text-xs"
                value={addon.name}
                onChange={(event) => {
                  const next = [...addons];
                  next[index] = { ...addon, name: event.target.value };
                  setAddons(next);
                }}
              />
              <ClearableNumberInput
                min={0}
                className="h-8 w-28 text-xs"
                value={addon.amount}
                onValueChange={(amount) => {
                  const next = [...addons];
                  next[index] = { ...addon, amount };
                  setAddons(next);
                }}
              />
              <span className="min-w-[4.5rem] text-right text-xs tabular-nums text-stone-600">
                {addon.selected
                  ? formatLabourCost(
                      Number(addon.ratePerSqFt || 0) > 0 &&
                        estimate?.totalBuiltUpArea
                        ? Number(addon.ratePerSqFt) * estimate.totalBuiltUpArea
                        : Number(addon.amount || 0),
                      currencyCode,
                    )
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 px-0 text-red-600"
                aria-label={`Remove ${addon.name}`}
                onClick={() =>
                  setAddons(addons.filter((item) => item.id !== addon.id))
                }
                icon={Trash2}
              />
            </li>
          ))}
        </ul>
        {addons.length > 0 ? (
          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
            <span className="font-semibold text-stone-700">
              {tParams("estimate.sectionTotal", {
                section: t("estimate.addons"),
              })}
            </span>
            <span className="font-semibold tabular-nums text-stone-900">
              {formatLabourCost(addonsSectionTotal, currencyCode)}
            </span>
          </div>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          icon={Plus}
          onClick={() =>
            setAddons([
              ...addons,
              {
                id: newId("addon"),
                name: "New add-on",
                amount: 0,
                selected: true,
              },
            ])
          }
        >
          {t("estimate.addAddon")}
        </Button>
      </CompactPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListEditor
          title="Included in quotation"
          items={includedItems}
          onChange={setIncludedItems}
          tone="include"
        />
        <ListEditor
          title="Not included / excluded"
          items={excludedItems}
          onChange={setExcludedItems}
          tone="exclude"
        />
      </div>

      <CompactPanel title="Client & details">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Quotation title
            </label>
            <Input
              className="h-9"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Client name
            </label>
            <Input
              className="h-9"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Client"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Client phone
            </label>
            <Input
              className="h-9"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Client email
            </label>
            <Input
              type="email"
              className="h-9"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Client address
            </label>
            <Input
              className="h-9"
              value={clientAddress}
              onChange={(event) => setClientAddress(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Quotation date
            </label>
            <Input
              type="date"
              className="h-9"
              value={quotationDate}
              onChange={(event) => setQuotationDate(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Valid until
            </label>
            <Input
              type="date"
              className="h-9"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Notes
            </label>
            <Textarea
              className="min-h-[5rem] text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Terms & conditions
            </label>
            <Textarea
              className="min-h-[5rem] text-sm"
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
            />
          </div>
        </div>
      </CompactPanel>

      <CompactPanel title="Save & continue">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Save as my template
            </label>
            <Input
              className="h-9"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={saveAsMyTemplate}
            icon={Save}
          >
            Save as my template
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={saveQuotation}
            icon={Sparkles}
          >
            {isPending ? "Saving..." : "Save draft quotation"}
          </Button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          <strong className="font-medium text-stone-600">Note:</strong>{" "}
          {QUOTATION_TEMPLATE_DISCLAIMER}
        </p>
      </CompactPanel>
    </div>
  );
}
