import { isMissingSchemaError } from "@/lib/auth/errors";
import { formatLabourCost } from "@/lib/labour/money";
import { formatMilli, parseQuantityToMilli } from "@/lib/materials/stock";
import type {
  ClientPortalAccessStatus,
  ClientPortalSettings,
  PortalBase,
} from "@/lib/client-portal/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/lib/client-portal/permissions";

export function defaultClientPortalSettings(): ClientPortalSettings {
  return { ...DEFAULT_CLIENT_PORTAL_SETTINGS };
}

export function clientPortalHomePath(base: PortalBase): string {
  return base.kind === "public"
    ? `/client/project/${base.token}`
    : `/client/preview/${base.projectId}`;
}

export function clientPortalHref(base: PortalBase, suffix = ""): string {
  const home = clientPortalHomePath(base);
  if (!suffix) {
    return home;
  }
  return `${home}/${suffix.replace(/^\//, "")}`;
}

export function buildClientPortalShareUrl(
  origin: string,
  token: string,
): string {
  return `${origin.replace(/\/$/, "")}/client/project/${encodeURIComponent(token)}`;
}

export function clientPortalUrlStorageKey(projectId: string): string {
  return `buildpilot:client-portal-url:${projectId}`;
}

export function portalAccessMessage(
  status: Exclude<ClientPortalAccessStatus, "ok">,
): string {
  if (status === "expired") {
    return "This client portal link has expired.";
  }

  if (status === "revoked") {
    return "This client portal link is no longer active.";
  }

  return "Client portal link is invalid or no longer available.";
}

export function portalUnavailableMessage(): string {
  return "This page is not available.";
}

export function portalLoadErrorMessage(): string {
  return "Unable to load this project. Please contact your contractor.";
}

export function getClientPortalErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  return portalLoadErrorMessage();
}

export function contractorPortalErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error) && error.code === "PGRST205") {
    return "The database schema is not fully set up. Run supabase/migrations/20240913220000_client_portal.sql.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("client portal creator")) {
    return "Only members of this business can manage the client portal.";
  }

  if (message.includes("same business")) {
    return "That project does not belong to this business.";
  }

  return "Unable to complete this action. Please try again.";
}

export function portalStatusFromAccess(input: {
  is_active: boolean;
  expires_at: string | null;
  now?: Date;
}): "active" | "inactive" | "expired" {
  if (!input.is_active) {
    return "inactive";
  }

  if (input.expires_at) {
    const expires = new Date(input.expires_at);
    const now = input.now ?? new Date();
    if (
      !Number.isNaN(expires.getTime()) &&
      expires.getTime() <= now.getTime()
    ) {
      return "expired";
    }
  }

  return "active";
}

export function formatPortalMoney(value: string | number | null): string {
  return formatLabourCost(value);
}

export function formatPortalQuantity(value: string | number): string {
  const milli = parseQuantityToMilli(value);
  return milli == null ? String(value) : formatMilli(milli);
}

export function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyString(value: number | string | null | undefined): string {
  if (value == null || value === "") {
    return "0.00";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return parsed.toFixed(2);
}

export function quantityString(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") {
    return "0";
  }

  return String(value);
}
