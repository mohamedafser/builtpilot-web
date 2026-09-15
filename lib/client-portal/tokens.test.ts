import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateClientPortalToken,
  hashClientPortalToken,
  isClientPortalToken,
  verifyClientPortalToken,
} from "./tokens";

describe("client portal tokens", () => {
  it("generates an unpredictable URL-safe token", () => {
    const token = generateClientPortalToken();
    assert.equal(isClientPortalToken(token), true);
    assert.notEqual(token, generateClientPortalToken());
  });

  it("stores a 64-character SHA-256 hash instead of the raw token", () => {
    const token = generateClientPortalToken();
    const hash = hashClientPortalToken(token);
    assert.equal(hash.length, 64);
    assert.equal(/^[0-9a-f]{64}$/.test(hash), true);
    assert.notEqual(hash, token);
  });

  it("verifies a token against its hash and rejects mismatches", () => {
    const token = generateClientPortalToken();
    const hash = hashClientPortalToken(token);
    assert.equal(verifyClientPortalToken(token, hash), true);
    assert.equal(verifyClientPortalToken(generateClientPortalToken(), hash), false);
    assert.equal(verifyClientPortalToken("project-id", hash), false);
  });

  it("accepts URL-encoded tokens from copied links", () => {
    const token = generateClientPortalToken();
    const encoded = encodeURIComponent(token);
    assert.equal(isClientPortalToken(encoded), true);
    assert.equal(
      verifyClientPortalToken(encoded, hashClientPortalToken(token)),
      true,
    );
  });
});
