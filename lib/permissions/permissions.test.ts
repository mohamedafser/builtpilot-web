import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasPermission,
  hasRole,
  permissionForPath,
  requirePermission,
} from "@/lib/permissions/permissions";
import { rejectOwnerRoleAssignment } from "@/lib/permissions/roles";

describe("organization permissions", () => {
  it("grants owner all permissions", () => {
    assert.equal(hasPermission("owner", "organization.delete"), true);
    assert.equal(hasPermission("owner", "organization.users.manage"), true);
    assert.equal(hasPermission("owner", "quotations.create"), true);
    assert.equal(hasPermission("owner", "ai.use"), true);
  });

  it("denies worker from organization settings and operational create", () => {
    assert.equal(hasPermission("worker", "organization.settings.manage"), false);
    assert.equal(hasPermission("worker", "organization.users.invite"), false);
    assert.equal(hasPermission("worker", "projects.create"), false);
    assert.equal(hasPermission("worker", "quotations.view"), false);
    assert.equal(hasPermission("worker", "materials.view"), false);
    assert.equal(hasPermission("worker", "dashboard.view"), true);
    assert.equal(hasPermission("worker", "tasks.update"), true);
  });

  it("allows admin to invite and change roles but not transfer ownership", () => {
    assert.equal(hasPermission("admin", "organization.users.invite"), true);
    assert.equal(hasPermission("admin", "organization.roles.manage"), true);
    assert.equal(hasPermission("admin", "organization.transfer_ownership"), false);
    assert.equal(hasPermission("admin", "organization.delete"), false);
  });

  it("scopes project manager to operations without user management", () => {
    assert.equal(hasPermission("project_manager", "projects.create"), true);
    assert.equal(hasPermission("project_manager", "quotations.view"), true);
    assert.equal(hasPermission("project_manager", "labour.view"), true);
    assert.equal(hasPermission("project_manager", "organization.users.view"), false);
    assert.equal(
      hasPermission("project_manager", "organization.settings.view"),
      false,
    );
  });

  it("scopes engineer away from quotations and settings", () => {
    assert.equal(hasPermission("engineer", "projects.view"), true);
    assert.equal(hasPermission("engineer", "boq.update"), true);
    assert.equal(hasPermission("engineer", "materials.view"), true);
    assert.equal(hasPermission("engineer", "quotations.view"), false);
    assert.equal(hasPermission("engineer", "organization.settings.view"), false);
  });

  it("scopes site supervisor to materials receive and labour", () => {
    assert.equal(hasPermission("site_supervisor", "materials.receive"), true);
    assert.equal(hasPermission("site_supervisor", "labour.create"), true);
    assert.equal(hasPermission("site_supervisor", "quotations.view"), false);
    assert.equal(hasPermission("site_supervisor", "ai.view"), true);
  });

  it("maps routes to permissions", () => {
    assert.equal(permissionForPath("/settings"), "organization.settings.view");
    assert.equal(permissionForPath("/quotations"), "quotations.view");
    assert.equal(
      permissionForPath("/projects/abc/boq"),
      "boq.view",
    );
  });

  it("treats owner as satisfying hasRole checks", () => {
    assert.equal(hasRole("owner", "admin"), true);
  });

  it("rejects owner assignment through invitations", () => {
    assert.throws(
      () => rejectOwnerRoleAssignment("owner"),
      /Owner role cannot be assigned through invitations/,
    );
  });

  it("returns unauthorized from requirePermission for engineers", () => {
    const result = requirePermission("engineer", "organization.roles.manage");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /permission/i);
    }
  });
});
