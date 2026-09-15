export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Bucket = Map<string, number[]>;

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
}) {
  const hits: Bucket = new Map();

  function prune(timestamps: number[], now: number) {
    const start = now - options.windowMs;
    return timestamps.filter((stamp) => stamp > start);
  }

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      const recent = prune(hits.get(key) ?? [], now);

      if (recent.length >= options.max) {
        const retryAfterMs = recent[0] + options.windowMs - now;
        hits.set(key, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }

      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

export const aiMinuteLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
});

export const aiHourLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 80,
});

export function checkAIRateLimit(userId: string, businessId: string) {
  const key = `${businessId}:${userId}`;
  const minute = aiMinuteLimiter.check(key);

  if (!minute.allowed) {
    return minute;
  }

  return aiHourLimiter.check(key);
}
