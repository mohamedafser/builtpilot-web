export const MATERIALS_ADJUSTMENTS_SEEN_COOKIE = "bp_materials_adjustments_seen";
export const MATERIALS_ADJUSTMENTS_SEEN_MAX_AGE = 60 * 60 * 24 * 365;

export function parseAdjustmentsSeenAt(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function isMaterialsAttentionPath(pathname: string): boolean {
  if (pathname === "/materials" || pathname.startsWith("/materials/")) {
    return true;
  }

  return /\/projects\/[^/]+\/materials(?:\/|$)/.test(pathname);
}
