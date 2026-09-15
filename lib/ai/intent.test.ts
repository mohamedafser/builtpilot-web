import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyIntent,
  shouldAskForProject,
  wantsProjectSwitch,
} from "./intent";

describe("BuildPilot AI intent classification", () => {
  it("routes brickwork completion to BOQ progress", () => {
    const result = classifyIntent("How much brickwork is complete?");
    assert.equal(result.intent, "BOQ_PROGRESS");
    assert.equal(result.workQuery, "brickwork");
    assert.equal(result.needsProject, true);
  });

  it("routes remaining brickwork to BOQ remaining", () => {
    const result = classifyIntent("How much brickwork remains?");
    assert.equal(result.intent, "BOQ_REMAINING");
  });

  it("routes weekly site activity to site reports", () => {
    const result = classifyIntent("What happened this week?");
    assert.equal(result.intent, "SITE_REPORT");
    assert.equal(result.period.label, "this week");
  });

  it("routes labour cost this month to labour summary", () => {
    const result = classifyIntent("How much did labour cost this month?");
    assert.equal(result.intent, "LABOUR_SUMMARY");
    assert.equal(result.period.label, "this month");
  });

  it("routes material usage to material summary", () => {
    const result = classifyIntent("What materials were used?");
    assert.equal(result.intent, "MATERIAL_SUMMARY");
  });

  it("routes project cost questions to project cost", () => {
    const result = classifyIntent("How much has the project cost?");
    assert.equal(result.intent, "PROJECT_COST");
    assert.equal(result.period.label, "current");
  });

  it("routes estimate vs actual questions", () => {
    const result = classifyIntent("Compare estimate vs actual.");
    assert.equal(result.intent, "ESTIMATE_VS_ACTUAL");
  });

  it("routes client update generation", () => {
    const result = classifyIntent("Create a client update.");
    assert.equal(result.intent, "CLIENT_UPDATE");
  });

  it("routes progress questions to BOQ", () => {
    const result = classifyIntent("What is the progress?");
    assert.equal(result.intent, "BOQ_PROGRESS");
  });

  it("keeps follow-up remaining work on the previous BOQ intent", () => {
    const result = classifyIntent(
      "What about the remaining work?",
      "How much brickwork is complete?",
    );
    assert.equal(result.intent, "BOQ_REMAINING");
    assert.equal(result.isFollowUp, true);
  });

  it("treats workspace-wide questions as global", () => {
    const result = classifyIntent("Which projects are currently active?");
    assert.equal(result.intent, "PROJECT_LIST");
    assert.equal(result.needsProject, false);
  });

  it("classifies general construction knowledge separately", () => {
    const result = classifyIntent("What is the difference between M20 and M25 concrete?");
    assert.equal(result.intent, "GENERAL_CONSTRUCTION");
    assert.equal(result.needsProject, false);
  });

  it("extracts a named project without treating work descriptions as names", () => {
    assert.equal(
      classifyIntent("How much brickwork remains on Villa Construction?").projectQuery,
      "Villa Construction",
    );
    assert.equal(
      classifyIntent("What about remaining work?").projectQuery,
      undefined,
    );
  });

  it("asks for a project on the first project question", () => {
    assert.equal(
      shouldAskForProject({ message: "How much brickwork remains?" }),
      true,
    );
  });

  it("keeps follow-ups on the selected project", () => {
    assert.equal(
      shouldAskForProject({
        message: "What about the remaining work?",
        previousUserMessage: "How much brickwork is complete?",
        selectedProjectId: "project-1",
      }),
      false,
    );
  });

  it("asks to switch for the next independent project question", () => {
    assert.equal(
      shouldAskForProject({
        message: "How much did labour cost this month?",
        previousUserMessage: "How much brickwork remains?",
        selectedProjectId: "project-1",
      }),
      true,
    );
  });

  it("skips the picker when a project is named in the question", () => {
    assert.equal(
      shouldAskForProject({
        message: "How much brickwork remains on Villa Construction?",
        selectedProjectId: "project-1",
      }),
      false,
    );
  });

  it("treats switch phrases as a project choice request", () => {
    assert.equal(wantsProjectSwitch("Switch project"), true);
    assert.equal(
      shouldAskForProject({
        message: "Answer this for another project",
        selectedProjectId: "project-1",
      }),
      true,
    );
  });
});
