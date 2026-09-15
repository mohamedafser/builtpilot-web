import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuid } from "@/lib/projects/helpers";
import { getAIStoreErrorMessage } from "./conversations";

describe("BuildPilot AI conversation storage errors", () => {
  it("accepts valid UUIDs used for conversation ids", () => {
    assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
    assert.equal(isUuid("not-a-uuid"), false);
  });

  it("detects missing AI schema tables and points to migrations", () => {
    const message = getAIStoreErrorMessage({
      message: 'relation "public.ai_messages" does not exist',
      code: "42P01",
    });

    assert.equal(
      message,
      "The database schema is not fully set up. Run the latest Supabase migration.",
    );
  });

  it("detects permission issues in the AI tables", () => {
    const message = getAIStoreErrorMessage({
      message: "permission denied for table ai_conversations",
      code: "42501",
    });

    assert.equal(
      message,
      "AI access is blocked by the current workspace permissions. Check your BuildPilot membership and Supabase policies.",
    );
  });

  it("keeps generic errors generic for unrelated failures", () => {
    const message = getAIStoreErrorMessage({
      message: "timeout while waiting for database connection",
      code: "ETIMEDOUT",
    });

    assert.equal(
      message,
      "Unable to load BuildPilot AI right now. Please try again.",
    );
  });
});
