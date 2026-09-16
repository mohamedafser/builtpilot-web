import {
  MATERIALS_ADJUSTMENTS_SEEN_COOKIE,
  MATERIALS_ADJUSTMENTS_SEEN_MAX_AGE,
  parseAdjustmentsSeenAt,
} from "@/lib/materials/adjustments-seen";
import { cookies } from "next/headers";

export async function readMaterialsAdjustmentsSeenAt(): Promise<string | null> {
  const cookieStore = await cookies();
  return parseAdjustmentsSeenAt(
    cookieStore.get(MATERIALS_ADJUSTMENTS_SEEN_COOKIE)?.value,
  );
}

export async function writeMaterialsAdjustmentsSeenAt(
  seenAt: string = new Date().toISOString(),
): Promise<string> {
  const normalized = parseAdjustmentsSeenAt(seenAt) ?? new Date().toISOString();
  const cookieStore = await cookies();
  cookieStore.set(MATERIALS_ADJUSTMENTS_SEEN_COOKIE, normalized, {
    path: "/",
    maxAge: MATERIALS_ADJUSTMENTS_SEEN_MAX_AGE,
    sameSite: "lax",
  });
  return normalized;
}
