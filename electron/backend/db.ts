import mysql, { type Pool, type PoolOptions, type RowDataPacket } from "mysql2/promise";
import type {
  ConnectionPayload,
  ReportPayload,
  ReportRequest,
  ReportRow,
  ResolvedUserResult,
  UserLookupResult,
} from "./dtos";

interface AttendanceQueryRow extends RowDataPacket {
  userId: string | number;
  username: string;
  fullName: string | null;
  attendanceDate: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  hours: number | null;
}

interface UserQueryRow extends RowDataPacket {
  id: string | number;
  username: string;
  fullName: string | null;
}

function formatDateValue(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatTimeValue(value: Date | string | null): string | null {
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

function toNumber(value: number | null): number {
  if (value === null || Number.isNaN(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function isSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  return (
    code === "ER_NO_SUCH_TABLE" ||
    code === "ER_BAD_FIELD_ERROR" ||
    code === "ER_PARSE_ERROR"
  );
}

function mapMySqlError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unknown MySQL error";
  }

  const typed = error as { code?: string; message?: string };
  switch (typed.code) {
    case "ECONNREFUSED":
      return "Connection refused. Verify host and port.";
    case "ER_ACCESS_DENIED_ERROR":
      return "Access denied. Verify username and password.";
    case "ER_BAD_DB_ERROR":
      return "Database not found. Verify the database name.";
    case "ETIMEDOUT":
      return "Connection timed out. Check network connectivity.";
    default:
      return typed.message ?? "Unexpected MySQL error";
  }
}

function createPoolConfig(connection: ConnectionPayload): PoolOptions {
  return {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    connectTimeout: 8000,
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0,
    timezone: "Z",
  };
}

function resolveDateRange(input: ReportRequest["dateRange"]): { from: string; to: string } {
  const now = new Date();

  if (input.preset === "current") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }

  if (input.preset === "last") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }

  if (!input.from || !input.to) {
    throw new Error("Custom date range requires both from and to dates.");
  }

  const from = new Date(input.from);
  const to = new Date(input.to);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date format in custom date range.");
  }

  if (from > to) {
    throw new Error("The 'from' date cannot be after the 'to' date.");
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export class MySqlConnectionService {
  private pool: Pool | null = null;

  constructor(
    private readonly logger: (message: string, details?: unknown) => void,
  ) {}

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
  }

  async initialize(connection: ConnectionPayload | null): Promise<void> {
    if (!connection) {
      return;
    }

    try {
      await this.setConnection(connection);
    } catch (error) {
      this.logger("Stored connection failed to initialize", error);
    }
  }

  async testConnection(connection: ConnectionPayload): Promise<void> {
    let tempConnection: mysql.Connection | null = null;

    try {
      tempConnection = await mysql.createConnection(createPoolConfig(connection));
      await tempConnection.query("SELECT 1");
    } catch (error) {
      throw new Error(mapMySqlError(error));
    } finally {
      if (tempConnection) {
        await tempConnection.end();
      }
    }
  }

  async setConnection(connection: ConnectionPayload): Promise<void> {
    await this.testConnection(connection);

    if (this.pool) {
      await this.pool.end();
    }

    this.pool = mysql.createPool(createPoolConfig(connection));
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error(
        "No database connection is configured. Open Connections and test a MySQL connection first.",
      );
    }

    return this.pool;
  }

  private normalizeUsers(rows: UserQueryRow[]): UserLookupResult[] {
    return rows.map((row) => ({
      id: String(row.id),
      username: row.username,
      fullName: row.fullName?.trim() || row.username,
    }));
  }

  async searchUsers(query: string, limit = 20): Promise<UserLookupResult[]> {
    const pool = this.getPool();
    const safeLimit = Math.max(1, Math.min(100, limit));
    const like = `%${query.trim()}%`;

    const attempts: Array<{ name: string; sql: string; params: unknown[] }> = [
      {
        name: "ohrm_user+hs_hr_employee",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS fullName
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          WHERE u.user_name LIKE ?
             OR CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) LIKE ?
          ORDER BY u.user_name ASC
          LIMIT ?
        `,
        params: [like, like, safeLimit],
      },
      {
        name: "ohrm_user",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            u.user_name AS fullName
          FROM ohrm_user u
          WHERE u.user_name LIKE ?
          ORDER BY u.user_name ASC
          LIMIT ?
        `,
        params: [like, safeLimit],
      },
      {
        name: "hs_hr_employee",
        sql: `
          SELECT
            CAST(e.emp_number AS CHAR) AS id,
            e.employee_id AS username,
            TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS fullName
          FROM hs_hr_employee e
          WHERE e.employee_id LIKE ?
             OR CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) LIKE ?
          ORDER BY e.employee_id ASC
          LIMIT ?
        `,
        params: [like, like, safeLimit],
      },
    ];

    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [rows] = await pool.query<UserQueryRow[]>(attempt.sql, attempt.params);
        return this.normalizeUsers(rows);
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapMySqlError(error));
      }
    }

    throw new Error(
      `Unable to read users because the OrangeHRM schema did not match expected tables (${schemaErrors.join(", ")}).`,
    );
  }

  async resolveUsersByUsername(usernames: string[]): Promise<ResolvedUserResult[]> {
    const pool = this.getPool();
    const normalizedLookup = usernames.map((username) => username.trim().toLowerCase());
    const uniqueLookup = Array.from(new Set(normalizedLookup));

    if (uniqueLookup.length === 0) {
      return [];
    }

    const placeholders = uniqueLookup.map(() => "?").join(",");

    const attempts: Array<{ name: string; sql: string; params: unknown[] }> = [
      {
        name: "ohrm_user+hs_hr_employee",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS fullName
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          WHERE LOWER(u.user_name) IN (${placeholders})
        `,
        params: uniqueLookup,
      },
      {
        name: "ohrm_user",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            u.user_name AS fullName
          FROM ohrm_user u
          WHERE LOWER(u.user_name) IN (${placeholders})
        `,
        params: uniqueLookup,
      },
    ];

    let matchedUsers: UserLookupResult[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [rows] = await pool.query<UserQueryRow[]>(attempt.sql, attempt.params);
        matchedUsers = this.normalizeUsers(rows);
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapMySqlError(error));
      }
    }

    if (matchedUsers.length === 0 && schemaErrors.length === attempts.length) {
      throw new Error(
        `Unable to resolve users because OrangeHRM user tables were not found (${schemaErrors.join(", ")}).`,
      );
    }

    const byUsername = new Map<string, UserLookupResult>();
    for (const user of matchedUsers) {
      byUsername.set(user.username.toLowerCase(), user);
    }

    return usernames.map((username) => {
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

  async buildReport(input: ReportRequest): Promise<ReportPayload> {
    const pool = this.getPool();

    if (input.userIds.length === 0) {
      return {
        rows: [],
        totals: {
          hours: 0,
          records: 0,
          users: 0,
        },
      };
    }

    const range = resolveDateRange(input.dateRange);
    const placeholders = input.userIds.map(() => "?").join(",");

    const attempts: Array<{ name: string; sql: string; params: unknown[] }> = [
      {
        name: "attendance_record_user_time",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS userId,
            u.user_name AS username,
            TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS fullName,
            DATE(ar.punch_in_user_time) AS attendanceDate,
            TIME(ar.punch_in_user_time) AS checkIn,
            TIME(ar.punch_out_user_time) AS checkOut,
            ROUND(TIMESTAMPDIFF(SECOND, ar.punch_in_user_time, ar.punch_out_user_time) / 3600, 2) AS hours
          FROM ohrm_attendance_record ar
          INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
          LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
          WHERE u.id IN (${placeholders})
            AND DATE(ar.punch_in_user_time) BETWEEN ? AND ?
          ORDER BY attendanceDate ASC, username ASC
        `,
        params: [...input.userIds, range.from, range.to],
      },
      {
        name: "attendance_record_utc_time",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS userId,
            u.user_name AS username,
            TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS fullName,
            DATE(ar.punch_in_utc_time) AS attendanceDate,
            TIME(ar.punch_in_utc_time) AS checkIn,
            TIME(ar.punch_out_utc_time) AS checkOut,
            ROUND(TIMESTAMPDIFF(SECOND, ar.punch_in_utc_time, ar.punch_out_utc_time) / 3600, 2) AS hours
          FROM ohrm_attendance_record ar
          INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
          LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
          WHERE u.id IN (${placeholders})
            AND DATE(ar.punch_in_utc_time) BETWEEN ? AND ?
          ORDER BY attendanceDate ASC, username ASC
        `,
        params: [...input.userIds, range.from, range.to],
      },
    ];

    let rows: AttendanceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [queryRows] = await pool.query<AttendanceQueryRow[]>(
          attempt.sql,
          attempt.params,
        );
        rows = queryRows;
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapMySqlError(error));
      }
    }

    if (rows.length === 0 && schemaErrors.length === attempts.length) {
      throw new Error(
        `Attendance schema is unsupported. Tried: ${schemaErrors.join(", ")}.`,
      );
    }

    const mappedRows: ReportRow[] = rows.map((row) => ({
      userId: String(row.userId),
      username: row.username,
      fullName: row.fullName?.trim() || row.username,
      date: formatDateValue(row.attendanceDate),
      checkIn: formatTimeValue(row.checkIn),
      checkOut: formatTimeValue(row.checkOut),
      hours: toNumber(row.hours),
    }));

    const totalHours = mappedRows.reduce((sum, row) => sum + row.hours, 0);
    const uniqueUsers = new Set(mappedRows.map((row) => row.userId));

    return {
      rows: mappedRows,
      totals: {
        hours: Math.round(totalHours * 100) / 100,
        records: mappedRows.length,
        users: uniqueUsers.size,
      },
    };
  }
}
