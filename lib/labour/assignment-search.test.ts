import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildWorkerSearchFilter } from "@/lib/labour/queries";
import { buildAssignableProjectSearchFilter } from "@/lib/workers/queries";

describe("assignment search filters", () => {
  it("sanitizes and formats worker search terms for backend filtering", () => {
    assert.equal(
      buildWorkerSearchFilter("  Ali  "),
      "name.ilike.%Ali%,phone.ilike.%Ali%",
    );
  });

  it("sanitizes and formats project search terms for backend filtering", () => {
    assert.equal(
      buildAssignableProjectSearchFilter("  Site 12  "),
      "name.ilike.%Site 12%,location.ilike.%Site 12%",
    );
  });
});
