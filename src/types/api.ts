export type DateRangePreset = "current" | "last" | "payroll-cycle" | "custom";
export type ExportFormat = "pdf" | "csv";
export type DateDisplayCalendar = "gregorian" | "shamsi";
export type DatabaseEngine = "mariadb" | "mysql" | "postgres" | "sqlite";

export interface ConnectionPayload {
  engine: DatabaseEngine;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  sqlitePath: string;
}

export interface UiSettings {
  theme: "light" | "dark";
  defaultExportFormat: ExportFormat;
  defaultDatePreset: DateRangePreset;
  defaultCalendar: DateDisplayCalendar;
  defaultPresenceRefreshSeconds: number;
  usernameValidationRegex: string;
}

export interface SettingsResponse {
  settings: UiSettings;
  connection: ConnectionPayload | null;
}

export interface AppUser {
  id: string | number;
  username: string;
  fullName: string;
  email?: string;
  employeeId?: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
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
  userDisplayName?: string;
  userDisplayMap?: Record<string, string>;
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
  engine: DatabaseEngine | null;
  dbName: string | null;
  latencyMs: number | null;
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
