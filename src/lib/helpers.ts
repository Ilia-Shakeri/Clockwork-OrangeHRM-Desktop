import {
  addMonths as addJalaliMonths,
  format as formatJalali,
  getDate as getJalaliDayOfMonth,
  getMonth as getJalaliMonth,
  getYear as getJalaliYear,
  newDate as newJalaliDate,
} from "date-fns-jalali";
import type {
  DateDisplayCalendar,
  DateRangeInput,
  DateRangePreset,
  ExportFormat,
} from "@/types/api";

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
