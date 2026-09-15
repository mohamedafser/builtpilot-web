import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makeProjectDocumentStoragePath } from "./documents";

describe("Project document storage paths", () => {
  it("builds a project-scoped storage path under the business folder", () => {
    const path = makeProjectDocumentStoragePath(
      "business-123",
      "project-456",
      "site-plan.pdf",
    );

    assert.equal(
      path,
      "business/business-123/projects/project-456/documents/site-plan.pdf",
    );
  });
});
