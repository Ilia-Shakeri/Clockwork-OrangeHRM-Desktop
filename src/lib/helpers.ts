import {
  addMonths as addJalaliMonths,
  format as formatJalali,
  getDate as getJalaliDayOfMonth,
  getMonth as getJalaliMonth,
  getYear as getJalaliYear,
  newDate as newJalaliDate,
} from "date-fns-jalali";
import type {
  AppUser,
  DateDisplayCalendar,
  DateRangeInput,
  DateRangePreset,
  ExportFormat,
  ReportRow,
} from "@/types/api";

const HIJRI_DATE_FORMATTER = new Intl.DateTimeFormat("en-u-ca-islamic", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function formatGregorianDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function dateParts(value: string): {
  gregorian: string;
  shamsi: string;
} {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return {
      gregorian: value,
      shamsi: value,
    };
  }

  return {
    gregorian: formatGregorianDate(parsed),
    shamsi: formatJalali(parsed, "yyyy/MM/dd"),
  };
}

export function dateTimeParts(value: string): {
  gregorian: string;
  shamsi: string;
} {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      gregorian: value,
      shamsi: value,
    };
  }

  const baseTime = formatTime(parsed);

  return {
    gregorian: `${formatGregorianDate(parsed)} ${baseTime}`,
    shamsi: `${formatJalali(parsed, "yyyy/MM/dd")} ${baseTime}`,
  };
}

function orderDateByPreference(
  parts: { gregorian: string; shamsi: string },
  defaultCalendar: DateDisplayCalendar,
): string[] {
  if (defaultCalendar === "gregorian") {
    return [
      `${parts.gregorian} (Gregorian)`,
      `${parts.shamsi} (Solar)`,
    ];
  }

  return [
    `${parts.shamsi} (Solar)`,
    `${parts.gregorian} (Gregorian)`,
  ];
}

function orderDateWithoutLabels(
  parts: { gregorian: string; shamsi: string },
  defaultCalendar: DateDisplayCalendar,
): string[] {
  if (defaultCalendar === "gregorian") {
    return [parts.gregorian, parts.shamsi];
  }

  return [parts.shamsi, parts.gregorian];
}

export function formatDate(value: string, defaultCalendar: DateDisplayCalendar = "shamsi"): string {
  return orderDateByPreference(dateParts(value), defaultCalendar).join(" | ");
}

export function formatDateTime(
  value: string,
  defaultCalendar: DateDisplayCalendar = "shamsi",
): string {
  return orderDateByPreference(dateTimeParts(value), defaultCalendar).join(" | ");
}

export function formatDateCompact(
  value: string,
  defaultCalendar: DateDisplayCalendar = "shamsi",
): string {
  return orderDateWithoutLabels(dateParts(value), defaultCalendar).join(" | ");
}

function payrollCycleRange(referenceDate: Date): { from: string; to: string } {
  const jalaliYear = getJalaliYear(referenceDate);
  const jalaliMonth = getJalaliMonth(referenceDate);
  const jalaliDay = getJalaliDayOfMonth(referenceDate);

  let cycleStartMonth = newJalaliDate(jalaliYear, jalaliMonth, 1);
  if (jalaliDay <= 25) {
    cycleStartMonth = addJalaliMonths(cycleStartMonth, -1);
  }

  const start = newJalaliDate(
    getJalaliYear(cycleStartMonth),
    getJalaliMonth(cycleStartMonth),
    26,
  );

  const cycleEndMonth = addJalaliMonths(start, 1);
  const end = newJalaliDate(
    getJalaliYear(cycleEndMonth),
    getJalaliMonth(cycleEndMonth),
    25,
  );

  return {
    from: toIsoDate(start),
    to: toIsoDate(end),
  };
}

export function defaultRangeForPreset(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();

  if (preset === "last") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toIsoDate(from), to: toIsoDate(to) };
  }

  if (preset === "payroll-cycle") {
    return payrollCycleRange(now);
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

export function formatHours(value: number): string {
  return `${value.toFixed(2)} hrs`;
}

export function formatDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? toIsoDate(parsed) : value;
}

export function formatShamsiDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  return parsed ? formatJalali(parsed, "yyyy-MM-dd") : value;
}

export function formatHijriDateOnly(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  try {
    const parts = HIJRI_DATE_FORMATTER.formatToParts(parsed);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
      return value;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } catch {
    return value;
  }
}

function normalizeNamePart(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isMeaningfulName(value: string): boolean {
  if (!value) {
    return false;
  }

  const lowered = value.toLowerCase();
  return lowered !== "unknown" && lowered !== "n/a" && lowered !== "-";
}

export function resolveUserDisplayName(
  source:
    | Pick<AppUser, "fullName" | "username" | "email" | "id">
    | Pick<ReportRow, "fullName" | "username" | "userId">,
): string {
  const fullName = normalizeNamePart(source.fullName);
  if (isMeaningfulName(fullName)) {
    return fullName;
  }

  const username = normalizeNamePart(source.username);
  if (isMeaningfulName(username)) {
    return username;
  }

  if ("email" in source) {
    const email = normalizeNamePart(source.email);
    if (isMeaningfulName(email)) {
      return email;
    }
  }

  if ("id" in source) {
    return normalizeNamePart(String(source.id)) || "user";
  }

  return normalizeNamePart(source.userId) || "user";
}

export function sanitizeWindowsFilename(value: string, maxLength = 80): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  let next = sanitized || "report";

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(next)) {
    next = `file_${next}`;
  }

  if (next.length > maxLength) {
    next = next.slice(0, maxLength).trim();
  }

  return next || "report";
}

export function buildReportFilename(input: {
  format: ExportFormat;
  from: string;
  to: string;
  displayName?: string;
  merged?: boolean;
  userCount?: number;
}): string {
  const from = formatDateOnly(input.from);
  const to = formatDateOnly(input.to);
  const range = `${from}_to_${to}`;

  if (input.merged && (input.userCount ?? 0) > 1) {
    return `reports_${input.userCount}users_${range}.${input.format}`;
  }

  const displayName = sanitizeWindowsFilename(input.displayName || "user");
  return `report_${displayName}_${range}.${input.format}`;
}

export function inferExportFormatFromPath(
  filePath: string,
  fallback: ExportFormat = "pdf",
): ExportFormat {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".csv")) {
    return "csv";
  }

  if (lower.endsWith(".pdf")) {
    return "pdf";
  }

  return fallback;
}

export function suggestedExportFilename(
  format: ExportFormat,
  from: string,
  to: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:T-]/g, "").slice(0, 14);
  return `clockwork_report_${formatDateOnly(from)}_to_${formatDateOnly(to)}_${timestamp}.${format}`;
}
