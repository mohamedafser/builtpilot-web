export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function sanitizeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[%_,.()\\*'"]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || "photo.jpg";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 120) || "photo.jpg";
}

export function previewText(
  value: string | null | undefined,
  max = 140,
): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max).trim()}…`;
}

export function workPreview(value: string | null | undefined): string {
  return previewText(value, 140);
}

export function formatWorkerCount(count: number): string {
  if (count === 1) {
    return "1 worker";
  }

  return `${count} workers`;
}
