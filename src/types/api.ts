export type DateRangePreset = "current" | "last" | "payroll-cycle" | "custom";
export type ExportFormat = "pdf" | "csv";
export type BulkScanMode = "combined" | "per-user";
export type DateDisplayCalendar = "gregorian" | "shamsi";

export interface ConnectionPayload {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface UiSettings {
  theme: "light" | "dark";
  defaultExportFormat: ExportFormat;
  defaultDatePreset: DateRangePreset;
  defaultCalendar: DateDisplayCalendar;
  usernameValidationRegex: string;
  bulkScanMode: BulkScanMode;
}

export interface SettingsResponse {
  settings: UiSettings;
  connection: ConnectionPayload | null;
}

export interface UserLookupResult {
  id: string;
  username: string;
  fullName: string;
}

export interface ResolvedUserResult {
  username: string;
  status: "matched" | "not-found" | "invalid";
  user?: UserLookupResult;
}

export interface DateRangeInput {
  preset: DateRangePreset;
  from?: string;
  to?: string;
}

export interface ReportRow {
  userId: string;
  username: string;
  fullName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number;
}

export interface ReportTotals {
  hours: number;
  records: number;
  users: number;
}

export interface ReportPayload {
  rows: ReportRow[];
  totals: ReportTotals;
}

export type PresenceStatus = "inside" | "out" | "unknown";

export interface PresenceRow {
  userId: string;
  username: string;
  fullName: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  status: PresenceStatus;
  workedHours: number;
  sinceCheckInMinutes?: number | null;
}

export interface PresenceTotals {
  inside: number;
  out: number;
  totalSeen: number;
}

export interface PresenceResponse {
  presenceDate: string;
  totals: PresenceTotals;
  rows: PresenceRow[];
}

export interface ExportMeta {
  title: string;
  from: string;
  to: string;
}

export interface ExportHistoryItem {
  id: string;
  format: ExportFormat;
  title: string;
  from: string;
  to: string;
  createdAt: string;
  filePath: string;
  rows: number;
  totalHours: number;
}

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export interface PythonStatusResponse {
  available: boolean;
  message: string;
}

export interface PythonSummaryResponse {
  summary: string;
  anomalies: Array<{ username: string; date: string; hours: number }>;
  rowCount: number;
}
