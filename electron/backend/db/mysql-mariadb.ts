import mysql, {
  type Pool,
  type PoolOptions,
  type RowDataPacket,
} from "mysql2/promise";
import type {
  ConnectionPayload,
  PresencePayload,
  ReportPayload,
  ReportRequest,
  ResolvedUserResult,
  UserLookupResult,
} from "../dtos";
import {
  computeSinceCheckInMinutes,
  formatDateValue,
  formatTimeValue,
  NO_DB_CONNECTION_ERROR,
  normalizeUsers,
  parseIsoDateInput,
  resolveDateRange,
  toInteger,
  toLocalIsoDate,
  toNumber,
  toResolvedUsers,
} from "./common";
import { createDialectHelpers } from "./query-builders/dialect";
import type { DbAdapter, DbLogger, QueryAttempt } from "./types";

interface MySqlUserQueryRow extends RowDataPacket {
  id: string | number;
  username: string;
  fullName: string | null;
}

interface MySqlAttendanceQueryRow extends RowDataPacket {
  userId: string | number;
  username: string;
  fullName: string | null;
  attendanceDate: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  hours: number | string | null;
}

interface MySqlPresenceQueryRow extends RowDataPacket {
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

const dialect = createDialectHelpers("mysql");

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
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  };
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
    return "Unknown database error";
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
      return typed.message ?? "Unexpected database error";
  }
}

export class MySqlMariaDbAdapter implements DbAdapter {
  private pool: Pool | null = null;

  constructor(
    private readonly engine: "mariadb" | "mysql",
    private readonly logger: DbLogger,
  ) {}

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
  }

  async connect(connection: ConnectionPayload): Promise<void> {
    if (connection.engine !== this.engine) {
      throw new Error(`Invalid engine for ${this.engine} adapter.`);
    }

    if (this.pool) {
      await this.pool.end();
    }

    this.pool = mysql.createPool(createPoolConfig(connection));
    await this.ping();
  }

  async ping(): Promise<void> {
    const pool = this.getPool();

    try {
      await pool.query("SELECT 1");
    } catch (error) {
      throw new Error(mapMySqlError(error));
    }
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error(NO_DB_CONNECTION_ERROR);
    }

    return this.pool;
  }

  async searchUsers(query: string, limit = 20): Promise<UserLookupResult[]> {
    const pool = this.getPool();
    const safeLimit = Math.max(1, Math.min(100, limit));
    const like = `%${query.trim()}%`;
    const fullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);

    const attempts: QueryAttempt[] = [
      {
        name: "ohrm_user+hs_hr_employee",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            ${fullNameExpr} AS fullName
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          WHERE ${dialect.caseInsensitiveLike("u.user_name", "?")}
             OR ${dialect.caseInsensitiveLike(fullNameExpr, "?")}
          ORDER BY u.user_name ASC
          ${dialect.limitOffset("?")}
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
          WHERE ${dialect.caseInsensitiveLike("u.user_name", "?")}
          ORDER BY u.user_name ASC
          ${dialect.limitOffset("?")}
        `,
        params: [like, safeLimit],
      },
      {
        name: "hs_hr_employee",
        sql: `
          SELECT
            CAST(e.emp_number AS CHAR) AS id,
            e.employee_id AS username,
            ${fullNameExpr} AS fullName
          FROM hs_hr_employee e
          WHERE ${dialect.caseInsensitiveLike("e.employee_id", "?")}
             OR ${dialect.caseInsensitiveLike(fullNameExpr, "?")}
          ORDER BY e.employee_id ASC
          ${dialect.limitOffset("?")}
        `,
        params: [like, like, safeLimit],
      },
    ];

    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [rows] = await pool.query<MySqlUserQueryRow[]>(
          attempt.sql,
          attempt.params,
        );
        return normalizeUsers(rows);
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
    const fullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);

    const attempts: QueryAttempt[] = [
      {
        name: "ohrm_user+hs_hr_employee",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            ${fullNameExpr} AS fullName
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
        const [rows] = await pool.query<MySqlUserQueryRow[]>(
          attempt.sql,
          attempt.params,
        );
        matchedUsers = normalizeUsers(rows);
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

    return toResolvedUsers(usernames, matchedUsers);
  }

  async getDailyPresence(dateIso: string): Promise<PresencePayload> {
    const pool = this.getPool();
    const parsedDate = parseIsoDateInput(dateIso);

    if (!parsedDate) {
      throw new Error("Invalid presence date. Expected YYYY-MM-DD.");
    }

    const normalizedDate = toLocalIsoDate(parsedDate);

    const fullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);
    const attempts = this.buildPresenceAttempts(fullNameExpr, normalizedDate);

    let rows: MySqlPresenceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [queryRows] = await pool.query<MySqlPresenceQueryRow[]>(
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

    const mappedRows: PresencePayload["rows"] = rows.map((row) => {
      const hasOpenPunch = toInteger(row.hasOpenPunch) > 0;
      const hasCompletedPunch = toInteger(row.hasCompletedPunch) > 0;
      const workedSeconds = toInteger(row.workedSeconds);
      const status = hasOpenPunch ? "inside" : hasCompletedPunch ? "out" : "unknown";

      return {
        userId: String(row.userId),
        username: row.username,
        fullName: row.fullName?.trim() || row.username,
        firstCheckIn: formatTimeValue(row.firstCheckIn),
        lastCheckOut: formatTimeValue(row.lastCheckOut),
        status,
        workedHours: toNumber(workedSeconds / 3600),
        sinceCheckInMinutes:
          status === "inside"
            ? computeSinceCheckInMinutes(normalizedDate, row.latestOpenCheckIn)
            : null,
      };
    });

    const totals = mappedRows.reduce(
      (accumulator, row) => {
        if (row.status === "inside") {
          accumulator.inside += 1;
        } else if (row.status === "out") {
          accumulator.out += 1;
        }

        return accumulator;
      },
      { inside: 0, out: 0 },
    );

    return {
      presenceDate: normalizedDate,
      totals: {
        inside: totals.inside,
        out: totals.out,
        totalSeen: mappedRows.length,
      },
      rows: mappedRows,
    };
  }

  private buildPresenceAttempts(
    fullNameExpr: string,
    dateIso: string,
  ): QueryAttempt[] {
    const buildAttempt = (name: string, punchInColumn: string, punchOutColumn: string) => ({
      name,
      sql: `
        SELECT
          CAST(u.id AS CHAR) AS userId,
          u.user_name AS username,
          ${fullNameExpr} AS fullName,
          MIN(ar.${punchInColumn}) AS firstCheckIn,
          MAX(ar.${punchOutColumn}) AS lastCheckOut,
          COALESCE(
            SUM(
              CASE
                WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NOT NULL
                  THEN ${dialect.timeDiffSeconds(`ar.${punchInColumn}`, `ar.${punchOutColumn}`)}
                ELSE 0
              END
            ),
            0
          ) AS workedSeconds,
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NULL THEN 1
              ELSE 0
            END
          ) AS hasOpenPunch,
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NOT NULL THEN 1
              ELSE 0
            END
          ) AS hasCompletedPunch,
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NULL
                THEN ar.${punchInColumn}
              ELSE NULL
            END
          ) AS latestOpenCheckIn
        FROM ohrm_attendance_record ar
        INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
        LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
        WHERE ${dialect.date(`ar.${punchInColumn}`)} = ?
        GROUP BY u.id, u.user_name, e.first_name, e.middle_name, e.last_name
        ORDER BY u.user_name ASC
      `,
      params: [dateIso],
    });

    return [
      buildAttempt(
        "attendance_record_user_time",
        "punch_in_user_time",
        "punch_out_user_time",
      ),
      buildAttempt(
        "attendance_record_utc_time",
        "punch_in_utc_time",
        "punch_out_utc_time",
      ),
    ];
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
    const fullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);
    const attempts = this.buildReportAttempts(fullNameExpr, placeholders, input, range);

    let rows: MySqlAttendanceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const [queryRows] = await pool.query<MySqlAttendanceQueryRow[]>(
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

    const mappedRows = rows.map((row) => ({
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

  private buildReportAttempts(
    fullNameExpr: string,
    placeholders: string,
    input: ReportRequest,
    range: { from: string; to: string },
  ): QueryAttempt[] {
    const buildAttempt = (name: string, punchInColumn: string, punchOutColumn: string) => ({
      name,
      sql: `
        SELECT
          CAST(u.id AS CHAR) AS userId,
          u.user_name AS username,
          ${fullNameExpr} AS fullName,
          ${dialect.date(`ar.${punchInColumn}`)} AS attendanceDate,
          ${dialect.time(`ar.${punchInColumn}`)} AS checkIn,
          ${dialect.time(`ar.${punchOutColumn}`)} AS checkOut,
          ROUND(${dialect.timeDiffSeconds(`ar.${punchInColumn}`, `ar.${punchOutColumn}`)} / 3600, 2) AS hours
        FROM ohrm_attendance_record ar
        INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
        LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
        WHERE u.id IN (${placeholders})
          AND ${dialect.date(`ar.${punchInColumn}`)} BETWEEN ? AND ?
        ORDER BY attendanceDate ASC, username ASC
      `,
      params: [...input.userIds, range.from, range.to],
    });

    return [
      buildAttempt(
        "attendance_record_user_time",
        "punch_in_user_time",
        "punch_out_user_time",
      ),
      buildAttempt(
        "attendance_record_utc_time",
        "punch_in_utc_time",
        "punch_out_utc_time",
      ),
    ];
  }
}
