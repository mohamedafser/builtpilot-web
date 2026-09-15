import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { shouldShowMaterialLoadingState } from "@/lib/materials/transaction-dialog-state";

describe("material transaction dialog state", () => {
  it("does not keep the material selector in a loading state after the list has loaded", () => {
    assert.equal(
      shouldShowMaterialLoadingState({
        materialsLoading: false,
        defaultMaterialId: "mat-123",
        materialCount: 0,
        mode: "receive",
      }),
      false,
    );
  });

  it("keeps the selector in loading state while the materials request is still in flight", () => {
    assert.equal(
      shouldShowMaterialLoadingState({
        materialsLoading: true,
        defaultMaterialId: "mat-123",
        materialCount: 0,
        mode: "receive",
      }),
      true,
    );
  });
});
