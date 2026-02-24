import type { DateRangeInput, DateRangePreset, ExportFormat } from "@/types/api";

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function defaultRangeForPreset(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();

  if (preset === "last") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toIsoDate(from), to: toIsoDate(to) };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(from), to: toIsoDate(now) };
}

export function buildDateRange(
  preset: DateRangePreset,
  customRange: { from: string; to: string },
): DateRangeInput {
  if (preset === "custom") {
    return {
      preset,
      from: customRange.from,
      to: customRange.to,
    };
  }

  return { preset };
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatHours(value: number): string {
  return `${value.toFixed(2)} hrs`;
}

export function suggestedExportFilename(
  format: ExportFormat,
  from: string,
  to: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:T-]/g, "").slice(0, 14);
  return `clockwork_report_${from}_to_${to}_${timestamp}.${format}`;
}

export function parseUsernamesFromText(input: string): string[] {
  const raw = input
    .split(/[\n,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(raw));
}
