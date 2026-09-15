import type { ManpowerRole, MaterialType, Weather } from "@/types";

export const WEATHER_VALUES: readonly Weather[] = [
  "sunny",
  "cloudy",
  "overcast",
  "rainy",
  "stormy",
  "windy",
  "hot",
  "cold",
  "foggy",
] as const;

export const WEATHER_LABELS: Record<Weather, string> = {
  sunny: "Sunny",
  cloudy: "Cloudy",
  overcast: "Overcast",
  rainy: "Rainy",
  stormy: "Stormy",
  windy: "Windy",
  hot: "Hot",
  cold: "Cold",
  foggy: "Foggy",
};

export function isWeather(value: string): value is Weather {
  return (WEATHER_VALUES as readonly string[]).includes(value);
}

export const MANPOWER_ROLES: readonly ManpowerRole[] = [
  "mason",
  "helper",
  "carpenter",
  "electrician",
  "plumber",
  "other",
] as const;

export const MANPOWER_ROLE_LABELS: Record<ManpowerRole, string> = {
  mason: "Masons",
  helper: "Helpers",
  carpenter: "Carpenters",
  electrician: "Electricians",
  plumber: "Plumbers",
  other: "Other",
};

export function isManpowerRole(value: string): value is ManpowerRole {
  return (MANPOWER_ROLES as readonly string[]).includes(value);
}

export const MATERIAL_TYPES: readonly MaterialType[] = [
  "received",
  "used",
] as const;

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  received: "Received",
  used: "Used",
};

export function isMaterialType(value: string): value is MaterialType {
  return (MATERIAL_TYPES as readonly string[]).includes(value);
}

export const MATERIAL_UNITS = [
  "bags",
  "kg",
  "tons",
  "cum",
  "nos",
  "liters",
  "m",
  "sqm",
] as const;

export const SITE_PHOTO_BUCKET = "site-photos";

export const MAX_SITE_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_SITE_PHOTOS_PER_UPLOAD = 20;
export const MAX_SITE_PHOTO_DIMENSION = 2560;

export const ACCEPTED_SITE_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const SITE_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

export type ManpowerCounts = Record<ManpowerRole, number>;

export function emptyManpowerCounts(): ManpowerCounts {
  return {
    mason: 0,
    helper: 0,
    carpenter: 0,
    electrician: 0,
    plumber: 0,
    other: 0,
  };
}

export function totalManpower(counts: ManpowerCounts): number {
  return MANPOWER_ROLES.reduce((sum, role) => sum + (counts[role] || 0), 0);
}
