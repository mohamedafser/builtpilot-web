import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuotationResponseUrl,
  generateQuotationResponseToken,
  hashQuotationResponseToken,
  isQuotationResponseToken,
  verifyQuotationResponseToken,
} from "./response-tokens";

describe("quotation response tokens", () => {
  it("generates and verifies a hashed token", () => {
    const token = generateQuotationResponseToken();
    assert.equal(isQuotationResponseToken(token), true);
    const hash = hashQuotationResponseToken(token);
    assert.equal(verifyQuotationResponseToken(token, hash), true);
    assert.equal(verifyQuotationResponseToken(`${token}x`, hash), false);
  });

  it("builds response URLs with optional action", () => {
    assert.equal(
      buildQuotationResponseUrl("https://app.example.com/", "abc_token"),
      "https://app.example.com/client/quotation/abc_token",
    );
    assert.equal(
      buildQuotationResponseUrl(
        "https://app.example.com",
        "abc_token",
        "accept",
      ),
      "https://app.example.com/client/quotation/abc_token?action=accept",
    );
  });
});
