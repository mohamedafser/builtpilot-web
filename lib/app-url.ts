/**
 * Public app origin for auth redirects, emails, metadata, and share links.
 *
 * Development: NEXT_PUBLIC_APP_URL=http://localhost:3000
 * Production:  NEXT_PUBLIC_APP_URL=https://builtpilot-web.vercel.app
 */
export const PRODUCTION_APP_URL = "https://builtpilot-web.vercel.app";

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function isProductionRuntime() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export function getAppBaseUrl(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured && !(isProductionRuntime() && isLocalhostOrigin(configured))) {
    return configured;
  }

  const vercel = normalizeOrigin(process.env.VERCEL_URL);
  if (vercel && !isLocalhostOrigin(vercel)) {
    return vercel;
  }

  if (isProductionRuntime()) {
    return PRODUCTION_APP_URL;
  }

  return configured && isLocalhostOrigin(configured)
    ? configured
    : "http://localhost:3000";
}

/**
 * Origin used for Supabase auth emailRedirectTo / redirectTo.
 *
 * Never send localhost confirmation links from a production deployment, even if
 * NEXT_PUBLIC_APP_URL was accidentally set to localhost in Vercel.
 */
export function resolveAuthOrigin(request: Request): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const headerOrigin = normalizeOrigin(request.headers.get("origin"));
  let requestUrlOrigin: string | null = null;

  try {
    requestUrlOrigin = new URL(request.url).origin.replace(/\/$/, "");
  } catch {
    requestUrlOrigin = null;
  }

  const candidates = [configured, headerOrigin, requestUrlOrigin];

  // Prefer any non-localhost public origin first (production / preview).
  for (const candidate of candidates) {
    if (candidate && !isLocalhostOrigin(candidate)) {
      return candidate;
    }
  }

  if (isProductionRuntime()) {
    return PRODUCTION_APP_URL;
  }

  // Local development only: allow localhost.
  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return "http://localhost:3000";
}
