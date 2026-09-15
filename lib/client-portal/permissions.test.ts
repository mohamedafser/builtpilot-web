import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CLIENT_PORTAL_SETTINGS,
  enabledClientPortalModules,
  isClientPortalModuleEnabled,
  pickClientPortalSettings,
} from "./permissions";

describe("client portal permissions", () => {
  it("hides quotation and project cost by default", () => {
    assert.equal(DEFAULT_CLIENT_PORTAL_SETTINGS.show_quotation, false);
    assert.equal(DEFAULT_CLIENT_PORTAL_SETTINGS.show_project_cost, false);
    assert.equal(
      isClientPortalModuleEnabled(DEFAULT_CLIENT_PORTAL_SETTINGS, "quotation"),
      false,
    );
    assert.equal(
      isClientPortalModuleEnabled(DEFAULT_CLIENT_PORTAL_SETTINGS, "cost"),
      false,
    );
  });

  it("only lists enabled modules", () => {
    const modules = enabledClientPortalModules({
      ...DEFAULT_CLIENT_PORTAL_SETTINGS,
      show_boq: false,
      show_quotation: true,
    });

    assert.equal(modules.includes("boq"), false);
    assert.equal(modules.includes("quotation"), true);
    assert.equal(modules.includes("cost"), false);
  });

  it("drops client contact fields from settings payloads", () => {
    const picked = pickClientPortalSettings({
      client_name: "Acme Builders",
      client_email: "acme@example.com",
      client_phone: "999",
      show_quotation: true,
      show_project_cost: false,
    });

    assert.deepEqual(picked, {
      show_quotation: true,
      show_project_cost: false,
    });
    assert.equal("client_name" in picked, false);
  });
});
