import type {
  AreaBasis,
  PlotAreaUnit,
  QuotationQualityLevel,
  QuotationTemplateDefinition,
  TemplateAddon,
  TemplateCostLine,
  TemplateFloorRate,
  TemplateListItem,
} from "@/lib/quotation-templates/types";
import { roundArea, roundMoney, toSqFt } from "@/lib/quotation-templates/units";

export type FloorAreaInput = {
  floor: number;
  /** Built-up area for this floor in sq.ft. Empty/0 means use shared area. */
  builtUpSqFt: number;
};

export type EstimateInput = {
  template: QuotationTemplateDefinition;
  qualityId: QuotationQualityLevel;
  areaBasis: AreaBasis;
  plotAreaValue: number;
  plotAreaUnit: PlotAreaUnit;
  /** Shared area applied to floors without a specific built-up value. */
  sharedBuiltUpSqFt: number;
  floorCount: number;
  /** Editable floor rates (may differ from template defaults). */
  floorRates: TemplateFloorRate[];
  materials: TemplateCostLine[];
  labour: TemplateCostLine[];
  otherCosts: TemplateCostLine[];
  includedItems: TemplateListItem[];
  excludedItems: TemplateListItem[];
  addons: Array<TemplateAddon & { selected: boolean }>;
  taxPercentage: number;
  contingencyPercentage: number;
  discountPercentage: number;
  /**
   * turnkey: floor package rates drive the total; material/labour are reference.
   * itemized: materials + labour + other are added on top of floor costs.
   */
  pricingMode: "turnkey" | "itemized";
  /** Per-floor built-up overrides. */
  floorAreas: FloorAreaInput[];
};

export type FloorCostBreakdown = {
  floor: number;
  name: string;
  areaSqFt: number;
  ratePerSqFt: number;
  amount: number;
};

export type LineCostBreakdown = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: TemplateCostLine["category"];
};

export type EstimateResult = {
  totalBuiltUpArea: number;
  plotAreaSqFt: number;
  areaBasis: AreaBasis;
  isEstimateOnly: boolean;
  floorCosts: FloorCostBreakdown[];
  constructionCost: number;
  materials: LineCostBreakdown[];
  labour: LineCostBreakdown[];
  other: LineCostBreakdown[];
  materialCost: number;
  labourCost: number;
  otherCost: number;
  addonCost: number;
  selectedAddons: Array<{ id: string; name: string; amount: number }>;
  contingencyAmount: number;
  discountAmount: number;
  subtotalBeforeTax: number;
  taxPercentage: number;
  taxAmount: number;
  grandTotal: number;
  includedItems: TemplateListItem[];
  excludedItems: TemplateListItem[];
};

function scaleQuantity(
  quantity: number,
  totalArea: number,
  referenceArea: number,
): number {
  if (referenceArea <= 0 || totalArea <= 0) {
    return quantity;
  }

  return roundArea(quantity * (totalArea / referenceArea));
}

function lineAmount(quantity: number, unitPrice: number): number {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

function resolveQualityRates(
  template: QuotationTemplateDefinition,
  qualityId: QuotationQualityLevel,
): TemplateFloorRate[] {
  const quality =
    template.qualityLevels.find((level) => level.id === qualityId) ??
    template.qualityLevels[0];

  return quality?.floorRates.map((rate) => ({ ...rate })) ?? [];
}

export function getDefaultFloorRates(
  template: QuotationTemplateDefinition,
  qualityId: QuotationQualityLevel,
): TemplateFloorRate[] {
  return resolveQualityRates(template, qualityId);
}

export function buildFloorRatesForCount(
  template: QuotationTemplateDefinition,
  qualityId: QuotationQualityLevel,
  floorCount: number,
  existing?: TemplateFloorRate[],
): TemplateFloorRate[] {
  const defaults = resolveQualityRates(template, qualityId);
  const count = Math.max(1, Math.min(20, Math.floor(floorCount)));
  const rates: TemplateFloorRate[] = [];

  for (let floor = 0; floor < count; floor += 1) {
    const fromExisting = existing?.find((rate) => rate.floor === floor);
    const fromDefault = defaults.find((rate) => rate.floor === floor);
    const lastDefault = defaults[defaults.length - 1];

    rates.push({
      floor,
      name:
        fromExisting?.name ??
        fromDefault?.name ??
        (floor === 0 ? "Ground Floor" : `Floor ${floor}`),
      ratePerSqFt:
        fromExisting?.ratePerSqFt ??
        fromDefault?.ratePerSqFt ??
        lastDefault?.ratePerSqFt ??
        0,
    });
  }

  return rates;
}

export function calculateTemplateQuotation(
  input: EstimateInput,
): EstimateResult {
  const plotAreaSqFt = roundArea(
    toSqFt(Math.max(0, input.plotAreaValue), input.plotAreaUnit),
  );
  const floorCount = Math.max(1, Math.min(20, Math.floor(input.floorCount)));
  const floorRates = buildFloorRatesForCount(
    input.template,
    input.qualityId,
    floorCount,
    input.floorRates,
  );

  const sharedArea =
    input.areaBasis === "plot"
      ? plotAreaSqFt
      : roundArea(Math.max(0, input.sharedBuiltUpSqFt));

  const floorCosts: FloorCostBreakdown[] = floorRates.map((rate) => {
    const override = input.floorAreas.find((area) => area.floor === rate.floor);
    const areaSqFt =
      input.areaBasis === "built_up" && override && override.builtUpSqFt > 0
        ? roundArea(override.builtUpSqFt)
        : sharedArea;

    return {
      floor: rate.floor,
      name: rate.name,
      areaSqFt,
      ratePerSqFt: Math.max(0, rate.ratePerSqFt),
      amount: lineAmount(areaSqFt, rate.ratePerSqFt),
    };
  });

  const totalBuiltUpArea = roundArea(
    floorCosts.reduce((sum, floor) => sum + floor.areaSqFt, 0),
  );
  const constructionCost = roundMoney(
    floorCosts.reduce((sum, floor) => sum + floor.amount, 0),
  );

  const scaleArea = totalBuiltUpArea > 0 ? totalBuiltUpArea : sharedArea;

  const materials = input.materials.map((line) => {
    const quantity = scaleQuantity(
      line.quantity,
      scaleArea,
      input.template.referenceAreaSqFt,
    );
    return {
      id: line.id,
      name: line.name,
      unit: line.unit,
      quantity,
      unitPrice: Math.max(0, line.unitPrice),
      amount: lineAmount(quantity, line.unitPrice),
      category: line.category,
    };
  });

  const labour = input.labour.map((line) => {
    const quantity = scaleQuantity(
      line.quantity,
      scaleArea,
      input.template.referenceAreaSqFt,
    );
    return {
      id: line.id,
      name: line.name,
      unit: line.unit,
      quantity,
      unitPrice: Math.max(0, line.unitPrice),
      amount: lineAmount(quantity, line.unitPrice),
      category: line.category,
    };
  });

  const other = input.otherCosts.map((line) => {
    const quantity = scaleQuantity(
      line.quantity,
      scaleArea,
      input.template.referenceAreaSqFt,
    );
    return {
      id: line.id,
      name: line.name,
      unit: line.unit,
      quantity,
      unitPrice: Math.max(0, line.unitPrice),
      amount: lineAmount(quantity, line.unitPrice),
      category: line.category,
    };
  });

  const materialCost = roundMoney(
    materials.reduce((sum, line) => sum + line.amount, 0),
  );
  const labourCost = roundMoney(
    labour.reduce((sum, line) => sum + line.amount, 0),
  );
  const otherCost = roundMoney(
    other.reduce((sum, line) => sum + line.amount, 0),
  );

  const selectedAddons = input.addons
    .filter((addon) => addon.selected)
    .map((addon) => {
      const amount = addon.ratePerSqFt
        ? lineAmount(totalBuiltUpArea, addon.amount)
        : roundMoney(Math.max(0, addon.amount));
      return { id: addon.id, name: addon.name, amount };
    });

  const addonCost = roundMoney(
    selectedAddons.reduce((sum, addon) => sum + addon.amount, 0),
  );

  const detailedCosts = roundMoney(materialCost + labourCost + otherCost);
  const packageBase =
    input.pricingMode === "itemized"
      ? roundMoney(constructionCost + detailedCosts + addonCost)
      : roundMoney(constructionCost + addonCost);

  const contingencyPercentage = Math.max(0, input.contingencyPercentage);
  const contingencyAmount = roundMoney(
    (packageBase * contingencyPercentage) / 100,
  );

  const afterContingency = roundMoney(packageBase + contingencyAmount);
  const discountPercentage = Math.min(
    100,
    Math.max(0, input.discountPercentage),
  );
  const discountAmount = roundMoney(
    (afterContingency * discountPercentage) / 100,
  );
  const subtotalBeforeTax = roundMoney(
    Math.max(0, afterContingency - discountAmount),
  );

  const taxPercentage = Math.max(0, input.taxPercentage);
  const taxAmount = roundMoney((subtotalBeforeTax * taxPercentage) / 100);
  const grandTotal = roundMoney(subtotalBeforeTax + taxAmount);

  return {
    totalBuiltUpArea,
    plotAreaSqFt,
    areaBasis: input.areaBasis,
    isEstimateOnly: input.areaBasis === "plot",
    floorCosts,
    constructionCost,
    materials,
    labour,
    other,
    materialCost,
    labourCost,
    otherCost,
    addonCost,
    selectedAddons,
    contingencyAmount,
    discountAmount,
    subtotalBeforeTax,
    taxPercentage,
    taxAmount,
    grandTotal,
    includedItems: input.includedItems.filter((item) => item.included),
    excludedItems: input.excludedItems,
  };
}
