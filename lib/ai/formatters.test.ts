import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMissing, formatProjectCost } from "./formatters";

describe("BuildPilot AI formatters", () => {
  it("states missing data without inventing numbers", () => {
    const text = formatMissing(
      "I can't calculate BOQ progress because this project doesn't have a BOQ yet.",
    );
    assert.match(text, /doesn't have a BOQ yet/);
    assert.doesNotMatch(text, /72%/);
  });

  it("formats actual cost from supplied totals only", () => {
    const text = formatProjectCost({
      labour_cost: "210000.00",
      material_cost: "480000.00",
      other_expenses: "75000.00",
      total_cost: "765000.00",
      labour_records: 12,
      material_records: 8,
      expense_records: 4,
      estimated_budget: "900000.00",
      remaining_budget: "135000.00",
      budget_used_percent: 85,
      budget_status: "within_budget",
    });
    assert.match(text, /Actual cost/);
    assert.doesNotMatch(text, /profit/i);
  });
});
