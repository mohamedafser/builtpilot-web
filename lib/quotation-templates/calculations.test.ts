import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFloorRatesForCount,
  calculateTemplateQuotation,
} from "./calculations";
import { indiaResidentialStandard } from "./defaults/india-residential-standard";
import { SQFT_PER_CENT } from "./types";

describe("calculateTemplateQuotation", () => {
  it("calculates ground floor estimate for 1 cent at standard rate", () => {
    const template = indiaResidentialStandard;
    const floorRates = buildFloorRatesForCount(template, "standard", 1);
    const result = calculateTemplateQuotation({
      template,
      qualityId: "standard",
      areaBasis: "built_up",
      plotAreaValue: 1,
      plotAreaUnit: "cent",
      sharedBuiltUpSqFt: SQFT_PER_CENT,
      floorCount: 1,
      floorRates,
      materials: template.materials,
      labour: template.labour,
      otherCosts: template.otherCosts,
      includedItems: template.includedItems,
      excludedItems: template.excludedItems,
      addons: template.addons.map((addon) => ({ ...addon, selected: false })),
      taxPercentage: 0,
      contingencyPercentage: 0,
      discountPercentage: 0,
      pricingMode: "turnkey",
      floorAreas: [{ floor: 0, builtUpSqFt: SQFT_PER_CENT }],
    });

    assert.equal(result.totalBuiltUpArea, SQFT_PER_CENT);
    assert.equal(result.constructionCost, 1132560);
    assert.equal(result.grandTotal, 1132560);
  });

  it("sums ground and first floor with different rates", () => {
    const template = indiaResidentialStandard;
    const floorRates = buildFloorRatesForCount(template, "standard", 2);
    const result = calculateTemplateQuotation({
      template,
      qualityId: "standard",
      areaBasis: "built_up",
      plotAreaValue: 1,
      plotAreaUnit: "cent",
      sharedBuiltUpSqFt: SQFT_PER_CENT,
      floorCount: 2,
      floorRates,
      materials: template.materials,
      labour: template.labour,
      otherCosts: template.otherCosts,
      includedItems: template.includedItems,
      excludedItems: template.excludedItems,
      addons: template.addons.map((addon) => ({ ...addon, selected: false })),
      taxPercentage: 0,
      contingencyPercentage: 0,
      discountPercentage: 0,
      pricingMode: "turnkey",
      floorAreas: [
        { floor: 0, builtUpSqFt: SQFT_PER_CENT },
        { floor: 1, builtUpSqFt: SQFT_PER_CENT },
      ],
    });

    assert.equal(result.floorCosts[0]?.amount, 1132560);
    assert.equal(result.floorCosts[1]?.amount, 1176120);
    assert.equal(result.constructionCost, 2308680);
  });
});
