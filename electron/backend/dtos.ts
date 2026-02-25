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

export interface DateRangeInput {
  preset: DateRangePreset;
  from?: string;
  to?: string;
}

export interface ReportRequest {
  userIds: string[];
  dateRange: DateRangeInput;
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

export interface UiSettings {
  theme: "light" | "dark";
  defaultExportFormat: ExportFormat;
  defaultDatePreset: DateRangePreset;
  defaultCalendar: DateDisplayCalendar;
  usernameValidationRegex: string;
  bulkScanMode: BulkScanMode;
}

export interface PersistedState {
  connection: ConnectionPayload | null;
  settings: UiSettings;
  exportHistory: ExportHistoryItem[];
}
