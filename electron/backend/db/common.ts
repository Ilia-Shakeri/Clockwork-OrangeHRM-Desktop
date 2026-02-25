import {
  addMonths as addJalaliMonths,
  getDate as getJalaliDayOfMonth,
  getMonth as getJalaliMonth,
  getYear as getJalaliYear,
  newDate as newJalaliDate,
} from "date-fns-jalali";
import type {
  ReportRequest,
  ResolvedUserResult,
  UserLookupResult,
} from "../dtos";
import type { UserQueryRow } from "./types";

export const NO_DB_CONNECTION_ERROR = "No database connection is configured.";

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

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

function resolvePayrollCycleRange(baseDate: Date): { from: string; to: string } {
  const baseJalaliYear = getJalaliYear(baseDate);
  const baseJalaliMonth = getJalaliMonth(baseDate);
  const baseJalaliDay = getJalaliDayOfMonth(baseDate);

  let startMonthAnchor = newJalaliDate(baseJalaliYear, baseJalaliMonth, 1);
  if (baseJalaliDay <= 25) {
    startMonthAnchor = addJalaliMonths(startMonthAnchor, -1);
  }

  const start = newJalaliDate(
    getJalaliYear(startMonthAnchor),
    getJalaliMonth(startMonthAnchor),
    26,
  );

  const endMonthAnchor = addJalaliMonths(start, 1);
  const end = newJalaliDate(
    getJalaliYear(endMonthAnchor),
    getJalaliMonth(endMonthAnchor),
    25,
  );

  return {
    from: toLocalIsoDate(start),
    to: toLocalIsoDate(end),
  };
}

export function resolveDateRange(
  input: ReportRequest["dateRange"],
): { from: string; to: string } {
  const now = new Date();

  if (input.preset === "current") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: toLocalIsoDate(from),
      to: toLocalIsoDate(now),
    };
  }

  if (input.preset === "last") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: toLocalIsoDate(from),
      to: toLocalIsoDate(to),
    };
  }

  if (input.preset === "payroll-cycle") {
    return resolvePayrollCycleRange(now);
  }

  if (!input.from || !input.to) {
    throw new Error("Custom date range requires both from and to dates.");
  }

  const from = parseIsoDateInput(input.from);
  const to = parseIsoDateInput(input.to);

  if (!from || !to) {
    throw new Error("Invalid date format in custom date range.");
  }

  if (from > to) {
    throw new Error("The 'from' date cannot be after the 'to' date.");
  }

  return {
    from: toLocalIsoDate(from),
    to: toLocalIsoDate(to),
  };
}

export function formatDateValue(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

export function formatTimeValue(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  const raw = String(value);
  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  return raw.slice(0, 5);
}

export function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }

  const numericValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * 100) / 100;
}

export function toInteger(value: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

export function computeSinceCheckInMinutes(
  dateIso: string,
  value: Date | string | null,
): number | null {
  if (!value) {
    return null;
  }

  let checkInDate: Date | null = null;

  if (value instanceof Date) {
    checkInDate = value;
  } else {
    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      checkInDate = parsed;
    } else {
      const timeMatch = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(raw);
      const date = parseIsoDateInput(dateIso);
      if (timeMatch && date) {
        checkInDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          Number(timeMatch[1]),
          Number(timeMatch[2]),
          0,
          0,
        );
      }
    }
  }

  if (!checkInDate || Number.isNaN(checkInDate.getTime())) {
    return null;
  }

  const diffMs = Date.now() - checkInDate.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / 60000);
}

export function normalizeUsers(rows: UserQueryRow[]): UserLookupResult[] {
  return rows.map((row) => ({
    id: String(row.id),
    username: row.username,
    fullName: row.fullName?.trim() || row.username,
  }));
}

export function toResolvedUsers(
  requestedUsernames: string[],
  matchedUsers: UserLookupResult[],
): ResolvedUserResult[] {
  const byUsername = new Map<string, UserLookupResult>();
  for (const user of matchedUsers) {
    byUsername.set(user.username.toLowerCase(), user);
  }

  return requestedUsernames.map((username) => {
    const lookup = byUsername.get(username.trim().toLowerCase());
    if (!lookup) {
      return {
        username,
        status: "not-found" as const,
      };
    }

    return {
      username,
      status: "matched" as const,
      user: lookup,
    };
  });
}
