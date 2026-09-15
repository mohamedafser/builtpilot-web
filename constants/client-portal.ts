import { WEATHER_LABELS, isWeather } from "@/constants/daily-report";
import { MANPOWER_ROLE_LABELS } from "@/constants/daily-report";
import { PROJECT_STATUS_LABELS } from "@/constants/project";
import type { ClientPortalModule } from "@/lib/client-portal/types";

export const CLIENT_PORTAL_NAV_ITEMS: Array<{
  key: ClientPortalModule;
  label: string;
  suffix: string;
}> = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "reports", label: "Site updates", suffix: "reports" },
  { key: "photos", label: "Photos", suffix: "photos" },
  { key: "boq", label: "Work progress", suffix: "boq" },
  { key: "measurements", label: "Measurements", suffix: "measurements" },
  { key: "quotation", label: "Quotation", suffix: "quotation" },
  { key: "cost", label: "Project cost", suffix: "cost" },
];

export const CLIENT_PORTAL_SETTING_LABELS = [
  {
    key: "show_project_overview" as const,
    label: "Project overview",
    description: "Show project name, dates, and description.",
  },
  {
    key: "show_daily_reports" as const,
    label: "Site updates",
    description: "Share daily site diary notes with the client.",
  },
  {
    key: "show_site_photos" as const,
    label: "Site photos",
    description: "Share photos from the site.",
  },
  {
    key: "show_boq" as const,
    label: "Work progress",
    description: "Share estimated vs completed work.",
  },
  {
    key: "show_measurements" as const,
    label: "Measurements",
    description: "Share recorded measurements.",
  },
  {
    key: "show_quotation" as const,
    label: "Quotation",
    description: "Share the accepted quotation. Off by default.",
  },
  {
    key: "show_project_cost" as const,
    label: "Project cost",
    description: "Share a simplified cost summary. Off by default.",
  },
  {
    key: "show_project_location" as const,
    label: "Project location",
    description: "Show the project site location.",
  },
  {
    key: "show_client_contact" as const,
    label: "Client contact",
    description: "Show the client name and contact details.",
  },
] as const;

export function weatherLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return isWeather(value) ? WEATHER_LABELS[value] : value;
}

export function projectStatusLabel(status: keyof typeof PROJECT_STATUS_LABELS) {
  return PROJECT_STATUS_LABELS[status];
}

export { MANPOWER_ROLE_LABELS };
