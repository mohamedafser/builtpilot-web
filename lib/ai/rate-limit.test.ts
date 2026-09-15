import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter } from "./rate-limit";

describe("BuildPilot AI rate limiting", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const first = limiter.check("user-1", 1_000);
    const second = limiter.check("user-1", 2_000);
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
  });

  it("blocks requests over the limit inside the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.check("user-1", 1_000);
    limiter.check("user-1", 2_000);
    const blocked = limiter.check("user-1", 3_000);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds > 0, true);
  });

  it("isolates users from each other", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check("user-1", 1_000);
    const other = limiter.check("user-2", 1_000);
    assert.equal(other.allowed, true);
  });
});
