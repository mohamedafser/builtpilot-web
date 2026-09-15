import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessConversation,
  canBindConversationProject,
  sameBusiness,
} from "./authorization";

describe("BuildPilot AI authorization helpers", () => {
  it("allows access only inside the same business", () => {
    assert.equal(sameBusiness("biz-a", "biz-a"), true);
    assert.equal(sameBusiness("biz-a", "biz-b"), false);
    assert.equal(sameBusiness("", ""), false);
  });

  it("requires the conversation owner and business to match", () => {
    assert.equal(
      canAccessConversation({
        userId: "user-1",
        userBusinessId: "biz-a",
        conversationUserId: "user-1",
        conversationBusinessId: "biz-a",
      }),
      true,
    );
    assert.equal(
      canAccessConversation({
        userId: "user-1",
        userBusinessId: "biz-a",
        conversationUserId: "user-1",
        conversationBusinessId: "biz-b",
      }),
      false,
    );
    assert.equal(
      canAccessConversation({
        userId: "user-1",
        userBusinessId: "biz-a",
        conversationUserId: "user-2",
        conversationBusinessId: "biz-a",
      }),
      false,
    );
  });

  it("prevents binding a project from another business", () => {
    assert.equal(
      canBindConversationProject({
        userBusinessId: "biz-a",
        projectBusinessId: "biz-b",
      }),
      false,
    );
  });
});
