import type {
  ClientPortalModule,
  ClientPortalSettings,
} from "@/lib/client-portal/types";

export const DEFAULT_CLIENT_PORTAL_SETTINGS: ClientPortalSettings = {
  show_project_overview: true,
  show_daily_reports: true,
  show_site_photos: true,
  show_boq: true,
  show_measurements: true,
  show_quotation: false,
  show_project_cost: false,
  show_client_contact: true,
  show_project_location: true,
};

export const CLIENT_PORTAL_MODULE_SETTING: Record<
  ClientPortalModule,
  keyof ClientPortalSettings
> = {
  overview: "show_project_overview",
  reports: "show_daily_reports",
  photos: "show_site_photos",
  boq: "show_boq",
  measurements: "show_measurements",
  quotation: "show_quotation",
  cost: "show_project_cost",
};

export const CLIENT_PORTAL_SETTING_KEYS = [
  "show_project_overview",
  "show_daily_reports",
  "show_site_photos",
  "show_boq",
  "show_measurements",
  "show_quotation",
  "show_project_cost",
  "show_client_contact",
  "show_project_location",
] as const;

export function pickClientPortalSettings(
  input: Partial<ClientPortalSettings> | Record<string, unknown>,
): Partial<ClientPortalSettings> {
  const result: Partial<ClientPortalSettings> = {};

  for (const key of CLIENT_PORTAL_SETTING_KEYS) {
    if (typeof input[key] === "boolean") {
      result[key] = input[key];
    }
  }

  return result;
}

export function isClientPortalModuleEnabled(
  settings: ClientPortalSettings,
  module: ClientPortalModule,
): boolean {
  return settings[CLIENT_PORTAL_MODULE_SETTING[module]];
}

export function enabledClientPortalModules(
  settings: ClientPortalSettings,
): ClientPortalModule[] {
  return (
    Object.keys(CLIENT_PORTAL_MODULE_SETTING) as ClientPortalModule[]
  ).filter((module) => isClientPortalModuleEnabled(settings, module));
}
