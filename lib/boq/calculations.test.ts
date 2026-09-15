import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBoqSummary,
  calculateEstimatedAmount,
  completionPercentage,
  generateBoqItemCode,
  itemCompletionStatus,
  measurementExceedsMessage,
  remainingQuantity,
  remainingValue,
  wouldExceedRemaining,
} from "./calculations";

describe("BOQ estimated amount", () => {
  it("multiplies quantity by rate using integer math", () => {
    assert.equal(calculateEstimatedAmount("500", "80"), "40000.00");
    assert.equal(calculateEstimatedAmount("2000", "75"), "150000.00");
    assert.equal(calculateEstimatedAmount("2.5", "100"), "250.00");
  });
});

describe("BOQ remaining quantity and value", () => {
  it("subtracts completed quantity from estimated quantity", () => {
    assert.equal(remainingQuantity("500", "300"), "200");
    assert.equal(remainingQuantity("2000", "1200"), "800");
  });

  it("calculates completed and remaining value from rate", () => {
    assert.equal(remainingValue("500", "300", "80"), "16000.00");
    assert.equal(remainingValue("2000", "1200", "75"), "60000.00");
  });
});

describe("BOQ completion percentage", () => {
  it("uses value-based completion, not item count", () => {
    assert.equal(completionPercentage("1200000", "2000000"), 60);
    assert.equal(completionPercentage("24000", "40000"), 60);
  });

  it("handles zero estimated value safely", () => {
    assert.equal(completionPercentage("0", "0"), null);
    assert.equal(completionPercentage("100", "0"), null);
  });
});

describe("BOQ summary totals", () => {
  it("sums section and BOQ totals from items", () => {
    const summary = buildBoqSummary([
      {
        estimated_quantity: "500",
        estimated_amount: "40000.00",
        completed_quantity: "300",
        rate: "80",
      },
      {
        estimated_quantity: "2000",
        estimated_amount: "150000.00",
        completed_quantity: "1200",
        rate: "75",
      },
    ]);

    assert.equal(summary.item_count, 2);
    assert.equal(summary.estimated_quantity, "2500");
    assert.equal(summary.estimated_value, "190000.00");
    assert.equal(summary.completed_value, "114000.00");
    assert.equal(summary.remaining_value, "76000.00");
    assert.equal(summary.completion_percentage, 60);
  });
});

describe("measurement overrun", () => {
  it("rejects a measurement greater than remaining quantity", () => {
    const result = wouldExceedRemaining("500", "450", "100");
    assert.equal(result.exceeds, true);
    assert.equal(result.remaining, "50");
    assert.equal(
      measurementExceedsMessage(result.remaining),
      "Measurement exceeds remaining quantity. Remaining quantity: 50.",
    );
  });

  it("accepts a measurement within remaining quantity", () => {
    const result = wouldExceedRemaining("500", "300", "200");
    assert.equal(result.exceeds, false);
    assert.equal(result.remaining, "200");
  });
});

describe("item completion status", () => {
  it("classifies not started, in progress, and completed", () => {
    assert.equal(itemCompletionStatus("500", "0"), "not_started");
    assert.equal(itemCompletionStatus("500", "300"), "in_progress");
    assert.equal(itemCompletionStatus("500", "500"), "completed");
  });
});

describe("BOQ item code generation", () => {
  it("creates section-based sequential codes", () => {
    assert.equal(
      generateBoqItemCode("Site Work", ["SW-001", "SW-002"]),
      "SW-003",
    );
    assert.equal(generateBoqItemCode("Foundation", ["FD-001"]), "FD-002");
    assert.equal(generateBoqItemCode("Plumbing and drainage", []), "PL-001");
    assert.equal(generateBoqItemCode("General", []), "GE-001");
  });
});
