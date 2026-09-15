import { createRateLimiter } from "@/lib/ai/rate-limit";

/** Per-user: 10 sends / minute */
export const whatsappUserMinuteLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
});

/** Per-business: 40 sends / minute */
export const whatsappBusinessMinuteLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 40,
});

/** Per-project: 20 sends / hour */
export const whatsappProjectHourLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 20,
});

export function checkWhatsAppRateLimit(input: {
  userId: string;
  businessId: string;
  projectId: string | null;
}) {
  const userKey = `u:${input.businessId}:${input.userId}`;
  const user = whatsappUserMinuteLimiter.check(userKey);

  if (!user.allowed) {
    return user;
  }

  const business = whatsappBusinessMinuteLimiter.check(`b:${input.businessId}`);

  if (!business.allowed) {
    return business;
  }

  if (input.projectId) {
    return whatsappProjectHourLimiter.check(`p:${input.projectId}`);
  }

  return { allowed: true as const, retryAfterSeconds: 0 };
}
