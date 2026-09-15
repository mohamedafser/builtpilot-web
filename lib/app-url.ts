/**
 * Public app origin for auth redirects, emails, metadata, and share links.
 *
 * Prefer NEXT_PUBLIC_APP_URL so production never falls back to localhost.
 *
 * Development: NEXT_PUBLIC_APP_URL=http://localhost:3000
 * Production:  NEXT_PUBLIC_APP_URL=https://builtpilot-web.vercel.app
 */
export const PRODUCTION_APP_URL = "https://builtpilot-web.vercel.app";

export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL;
  }

  return "http://localhost:3000";
}

/**
 * Origin used for Supabase auth emailRedirectTo / redirectTo.
 * Prefers NEXT_PUBLIC_APP_URL so confirmation links never point at localhost
 * when the production env var is set.
 */
export function resolveAuthOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const requestOrigin = request.headers.get("origin")?.trim();
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }

  try {
    return new URL(request.url).origin.replace(/\/$/, "");
  } catch {
    // fall through
  }

  return getAppBaseUrl();
}
