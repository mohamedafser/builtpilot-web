import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chatRequestSchema,
  clientUpdateDraftSchema,
  dailyReportDraftSchema,
} from "./schemas";

describe("BuildPilot AI request validation", () => {
  it("accepts a valid chat request", () => {
    const parsed = chatRequestSchema.parse({
      message: "How much brickwork remains?",
      projectId: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(parsed.message, "How much brickwork remains?");
  });

  it("rejects empty chat messages", () => {
    const parsed = chatRequestSchema.safeParse({ message: "   " });
    assert.equal(parsed.success, false);
  });

  it("rejects client-supplied business ids because they are not in the schema", () => {
    const parsed = chatRequestSchema.parse({
      message: "Summarize this project",
      business_id: "should-be-ignored",
    });
    assert.equal("business_id" in parsed, false);
  });

  it("rejects invalid conversation ids", () => {
    const parsed = chatRequestSchema.safeParse({
      message: "Hello",
      conversationId: "not-a-uuid",
    });
    assert.equal(parsed.success, false);
  });
});

describe("BuildPilot AI structured output validation", () => {
  it("accepts a daily report draft", () => {
    const draft = dailyReportDraftSchema.parse({
      report_date: "2026-09-13",
      work_completed: "Finished 300 sq ft of brickwork on the east wall.",
      issues: "Cement delivery came late.",
      tomorrow_plan: "Continue first-floor brickwork.",
      general_notes: "Five masons and four helpers on site.",
    });
    assert.equal(draft.issues.includes("Cement"), true);
  });

  it("rejects a daily report draft without work completed", () => {
    const parsed = dailyReportDraftSchema.safeParse({
      report_date: "2026-09-13",
      work_completed: "",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects invalid daily report JSON", () => {
    const parsed = dailyReportDraftSchema.safeParse({
      work_completed: 300,
    });
    assert.equal(parsed.success, false);
  });

  it("accepts a client update draft", () => {
    const draft = clientUpdateDraftSchema.parse({
      title: "Villa Construction update",
      this_week: ["Ground floor brickwork completed"],
      current_progress: "68%",
      upcoming: ["First-floor brickwork"],
      issues: ["Cement delivery delayed by one day"],
      closing: "Thank you for reviewing this week's progress.",
    });
    assert.equal(draft.this_week.length, 1);
  });

  it("rejects a client update with invalid progress arrays", () => {
    const parsed = clientUpdateDraftSchema.safeParse({
      title: "Update",
      this_week: [""],
      current_progress: null,
      upcoming: [],
      issues: [],
      closing: "",
    });
    assert.equal(parsed.success, false);
  });
});
