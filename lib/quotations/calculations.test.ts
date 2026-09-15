import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEstimateVsActual,
  buildQuotationCostBreakdown,
  calculateLineTotal,
  calculateQuotationItems,
  calculateQuotationTotals,
  effectiveQuotationStatus,
  quotationActions,
  shiftedValidUntil,
} from "./calculations";

describe("quotation line totals", () => {
  it("multiplies quantity by unit price", () => {
    assert.equal(calculateLineTotal("100", "420"), "42000.00");
    assert.equal(calculateLineTotal("20", "1000"), "20000.00");
    assert.equal(calculateLineTotal("1", "5000"), "5000.00");
  });

  it("rounds fractional quantity using milli units", () => {
    assert.equal(calculateLineTotal("2.5", "100"), "250.00");
    assert.equal(calculateLineTotal("0.125", "80"), "10.00");
  });
});

describe("quotation totals", () => {
  it("sums item totals into the subtotal", () => {
    const items = calculateQuotationItems([
      {
        item_type: "material",
        material_id: "11111111-1111-1111-1111-111111111111",
        worker_id: null,
        description: "Cement",
        quantity: "100",
        unit: "bag",
        unit_price: "420",
        notes: null,
      },
      {
        item_type: "labour",
        material_id: null,
        worker_id: "22222222-2222-2222-2222-222222222222",
        description: "Masonry work",
        quantity: "20",
        unit: "day",
        unit_price: "1000",
        notes: null,
      },
      {
        item_type: "custom",
        material_id: null,
        worker_id: null,
        description: "Site transportation",
        quantity: "1",
        unit: "lot",
        unit_price: "5000",
        notes: null,
      },
    ]);

    assert.ok(!("error" in items));
    const totals = calculateQuotationTotals({
      items,
      discount_type: null,
      discount_value: "",
      tax_percentage: "",
    });

    assert.equal(totals.subtotal, "67000.00");
    assert.equal(totals.discount_amount, "0.00");
    assert.equal(totals.tax_amount, "0.00");
    assert.equal(totals.total_amount, "67000.00");
  });

  it("updates totals when a discount is added after items", () => {
    const items = [
      { total_amount: "42000.00" },
      { total_amount: "20000.00" },
      { total_amount: "5000.00" },
    ];
    const before = calculateQuotationTotals({
      items,
      discount_type: null,
      discount_value: "",
      tax_percentage: "",
    });

    assert.equal(before.subtotal, "67000.00");
    assert.equal(before.discount_amount, "0.00");
    assert.equal(before.total_amount, "67000.00");

    const after = calculateQuotationTotals({
      items,
      discount_type: "percentage",
      discount_value: "10",
      tax_percentage: "",
    });

    assert.equal(after.subtotal, "67000.00");
    assert.equal(after.discount_amount, "6700.00");
    assert.equal(after.total_amount, "60300.00");
  });

  it("applies a percentage discount before tax", () => {
    const totals = calculateQuotationTotals({
      items: [{ total_amount: "100000.00" }],
      discount_type: "percentage",
      discount_value: "10",
      tax_percentage: "5",
    });

    assert.equal(totals.discount_amount, "10000.00");
    assert.equal(totals.tax_amount, "4500.00");
    assert.equal(totals.total_amount, "94500.00");
  });

  it("applies a fixed discount and never goes negative", () => {
    const totals = calculateQuotationTotals({
      items: [{ total_amount: "100000.00" }],
      discount_type: "fixed",
      discount_value: "5000",
      tax_percentage: "",
    });

    assert.equal(totals.discount_amount, "5000.00");
    assert.equal(totals.total_amount, "95000.00");

    const clamped = calculateQuotationTotals({
      items: [{ total_amount: "1000.00" }],
      discount_type: "fixed",
      discount_value: "5000",
      tax_percentage: "",
    });

    assert.equal(clamped.discount_amount, "1000.00");
    assert.equal(clamped.total_amount, "0.00");
  });
});

describe("quotation status and actions", () => {
  it("treats a sent quotation past valid_until as expired", () => {
    assert.equal(
      effectiveQuotationStatus("sent", "2026-09-01", "2026-09-13"),
      "expired",
    );
    assert.equal(
      effectiveQuotationStatus("sent", "2026-09-20", "2026-09-13"),
      "sent",
    );
    assert.equal(
      effectiveQuotationStatus("accepted", "2026-09-01", "2026-09-13"),
      "accepted",
    );
  });

  it("limits actions by status", () => {
    assert.equal(quotationActions("draft", false).edit, true);
    assert.equal(quotationActions("sent", false).edit, false);
    assert.equal(quotationActions("sent", false).accept, true);
    assert.equal(quotationActions("accepted", false).convert, true);
    assert.equal(quotationActions("accepted", true).convert, false);
    assert.equal(quotationActions("expired", false).duplicate, true);
    assert.equal(quotationActions("expired", false).send, false);
  });
});

describe("estimate vs actual", () => {
  it("breaks down estimated items by type", () => {
    const breakdown = buildQuotationCostBreakdown([
      { item_type: "material", total_amount: "600000.00" },
      { item_type: "labour", total_amount: "300000.00" },
      { item_type: "custom", total_amount: "100000.00" },
    ]);

    assert.equal(breakdown.materials, "600000.00");
    assert.equal(breakdown.labour, "300000.00");
    assert.equal(breakdown.other, "100000.00");
    assert.equal(breakdown.total, "1000000.00");
  });

  it("compares estimated and actual project cost", () => {
    const comparison = buildEstimateVsActual(
      {
        materials: "600000.00",
        labour: "300000.00",
        other: "100000.00",
        total: "1000000.00",
        material_count: 1,
        labour_count: 1,
        other_count: 1,
      },
      {
        labour_cost: "270000.00",
        material_cost: "640000.00",
        other_expenses: "80000.00",
        total_cost: "990000.00",
      },
    );

    assert.equal(comparison.labour.actual, "270000.00");
    assert.equal(comparison.materials.over_estimate, true);
    assert.equal(comparison.total.difference, "10000.00");
    assert.equal(comparison.total.variance_percentage, 99);
  });

  it("handles a zero estimate safely", () => {
    const comparison = buildEstimateVsActual(
      {
        materials: "0.00",
        labour: "0.00",
        other: "0.00",
        total: "0.00",
        material_count: 0,
        labour_count: 0,
        other_count: 0,
      },
      {
        labour_cost: "100.00",
        material_cost: "0.00",
        other_expenses: "0.00",
        total_cost: "100.00",
      },
    );

    assert.equal(comparison.total.variance_percentage, null);
    assert.equal(comparison.total.over_estimate, true);
  });
});

describe("duplicate validity window", () => {
  it("shifts valid_until by the original period", () => {
    assert.equal(
      shiftedValidUntil("2026-01-01", "2026-01-31", "2026-09-13"),
      "2026-10-13",
    );
    assert.equal(shiftedValidUntil("2026-01-01", null, "2026-09-13"), null);
  });
});
