import type {
  AppUser,
  ConnectionPayload,
  PresencePayload,
  ReportPayload,
  ReportRequest,
  UserQueryInput,
} from "../dtos";

export interface DbConnectionInfo {
  engine: ConnectionPayload["engine"];
  dbName: string;
}

export interface DbClient {
  close(): Promise<void>;
  initialize(connection: ConnectionPayload | null): Promise<void>;
  testConnection(connection: ConnectionPayload): Promise<void>;
  setConnection(connection: ConnectionPayload): Promise<void>;
  ping(): Promise<void>;
  getConnectionInfo(): DbConnectionInfo | null;
  getUsers(input: UserQueryInput): Promise<AppUser[]>;
  getDailyPresence(dateIso: string): Promise<PresencePayload>;
  buildReport(input: ReportRequest): Promise<ReportPayload>;
}

export interface DbAdapter {
  close(): Promise<void>;
  connect(connection: ConnectionPayload): Promise<void>;
  ping(): Promise<void>;
  getUsers(input: UserQueryInput): Promise<AppUser[]>;
  getDailyPresence(dateIso: string): Promise<PresencePayload>;
  buildReport(input: ReportRequest): Promise<ReportPayload>;
}

export interface QueryAttempt {
  name: string;
  sql: string;
  params: unknown[];
}

export interface AttendanceQueryRow {
  userId: string | number;
  username: string;
  fullName: string | null;
  attendanceDate: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  hours: number | string | null;
}

export interface PresenceQueryRow {
  userId: string | number;
  username: string;
  fullName: string | null;
  firstCheckIn: Date | string | null;
  lastCheckOut: Date | string | null;
  workedSeconds: number | string | null;
  hasOpenPunch: number | string | null;
  hasCompletedPunch: number | string | null;
  latestOpenCheckIn: Date | string | null;
}

export interface UserQueryRow {
  id: string | number;
  username: string;
  fullName: string | null;
  email?: string | null;
  employeeId?: string | number | null;
}

export type DbLogger = (message: string, details?: unknown) => void;
