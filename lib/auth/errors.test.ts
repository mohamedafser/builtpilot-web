import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUTH_MESSAGES } from "./constants";
import { getAuthErrorMessage } from "./errors";

describe("getAuthErrorMessage", () => {
  it("returns a clear duplicate-email message for Supabase email-in-use errors", () => {
    const result = getAuthErrorMessage(
      {
        message: "Email already in use",
        code: "email_address_already_in_use",
        status: 400,
      },
      "signup",
    );

    assert.equal(result, AUTH_MESSAGES.signupDuplicate);
  });

  it("returns login messages for common auth failures", () => {
    assert.equal(
      getAuthErrorMessage(
        { message: "Invalid login credentials", code: "invalid_credentials" },
        "login",
      ),
      AUTH_MESSAGES.loginInvalid,
    );
    assert.equal(
      getAuthErrorMessage(
        { message: "Email not confirmed", code: "email_not_confirmed" },
        "login",
      ),
      AUTH_MESSAGES.loginUnconfirmed,
    );
  });

  it("returns rate-limit messaging across auth flows", () => {
    assert.equal(
      getAuthErrorMessage(
        { message: "Email rate limit exceeded", status: 429 },
        "signup-resend",
      ),
      AUTH_MESSAGES.rateLimited,
    );
  });

  it("returns reset and forgot-password fallbacks", () => {
    assert.equal(
      getAuthErrorMessage(
        { message: "New password should be different from the old password." },
        "reset-password",
      ),
      AUTH_MESSAGES.resetPasswordSame,
    );
    assert.equal(
      getAuthErrorMessage({ message: "smtp error" }, "forgot-password"),
      AUTH_MESSAGES.forgotPasswordFailed,
    );
  });
});
