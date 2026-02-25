import { Pool, type PoolConfig } from "pg";
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
import type {
  AttendanceQueryRow,
  DbAdapter,
  QueryAttempt,
  UserQueryRow,
  PresenceQueryRow,
} from "./types";

const dialect = createDialectHelpers("postgres");

function createPoolConfig(connection: ConnectionPayload): PoolConfig {
  return {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    connectionTimeoutMillis: 8000,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
    max: 8,
  };
}

function buildPostgresPlaceholders(count: number, startIndex = 1): string {
  return Array.from({ length: count }, (_value, index) => `$${startIndex + index}`).join(",");
}

function isSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    code === "42601" // syntax_error
  );
}

function mapPostgresError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unknown database error";
  }

  const typed = error as { code?: string; message?: string };
  switch (typed.code) {
    case "ECONNREFUSED":
      return "Connection refused. Verify host and port.";
    case "28P01":
      return "Access denied. Verify username and password.";
    case "3D000":
      return "Database not found. Verify the database name.";
    case "ETIMEDOUT":
      return "Connection timed out. Check network connectivity.";
    default:
      return typed.message ?? "Unexpected database error";
  }
}

export class PostgresAdapter implements DbAdapter {
  private pool: Pool | null = null;

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
  }

  async connect(connection: ConnectionPayload): Promise<void> {
    if (connection.engine !== "postgres") {
      throw new Error("Invalid engine for postgres adapter.");
    }

    const nextPool = new Pool(createPoolConfig(connection));

    try {
      await nextPool.query("SELECT 1");
    } catch (error) {
      await nextPool.end().catch(() => undefined);
      throw new Error(mapPostgresError(error));
    }

    const previousPool = this.pool;
    this.pool = nextPool;
    if (previousPool) {
      await previousPool.end();
    }
  }

  async ping(): Promise<void> {
    const pool = this.getPool();

    try {
      await pool.query("SELECT 1");
    } catch (error) {
      throw new Error(mapPostgresError(error));
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
            CAST(u.id AS TEXT) AS id,
            u.user_name AS username,
            ${fullNameExpr} AS "fullName"
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          WHERE ${dialect.caseInsensitiveLike("u.user_name", "$1")}
             OR ${dialect.caseInsensitiveLike(fullNameExpr, "$2")}
          ORDER BY u.user_name ASC
          ${dialect.limitOffset("$3")}
        `,
        params: [like, like, safeLimit],
      },
      {
        name: "ohrm_user",
        sql: `
          SELECT
            CAST(u.id AS TEXT) AS id,
            u.user_name AS username,
            u.user_name AS "fullName"
          FROM ohrm_user u
          WHERE ${dialect.caseInsensitiveLike("u.user_name", "$1")}
          ORDER BY u.user_name ASC
          ${dialect.limitOffset("$2")}
        `,
        params: [like, safeLimit],
      },
      {
        name: "hs_hr_employee",
        sql: `
          SELECT
            CAST(e.emp_number AS TEXT) AS id,
            e.employee_id AS username,
            ${fullNameExpr} AS "fullName"
          FROM hs_hr_employee e
          WHERE ${dialect.caseInsensitiveLike("e.employee_id", "$1")}
             OR ${dialect.caseInsensitiveLike(fullNameExpr, "$2")}
          ORDER BY e.employee_id ASC
          ${dialect.limitOffset("$3")}
        `,
        params: [like, like, safeLimit],
      },
    ];

    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const result = await pool.query<UserQueryRow>(attempt.sql, attempt.params);
        return normalizeUsers(result.rows);
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapPostgresError(error));
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

    const placeholders = buildPostgresPlaceholders(uniqueLookup.length);
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
            CAST(u.id AS TEXT) AS id,
            u.user_name AS username,
            ${fullNameExpr} AS "fullName"
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
            CAST(u.id AS TEXT) AS id,
            u.user_name AS username,
            u.user_name AS "fullName"
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
        const result = await pool.query<UserQueryRow>(attempt.sql, attempt.params);
        matchedUsers = normalizeUsers(result.rows);
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapPostgresError(error));
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
    const attempts = this.buildPresenceAttempts(fullNameExpr);

    let rows: PresenceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const result = await pool.query<PresenceQueryRow>(attempt.sql, [normalizedDate]);
        rows = result.rows;
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapPostgresError(error));
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

  private buildPresenceAttempts(fullNameExpr: string): QueryAttempt[] {
    const buildAttempt = (name: string, punchInColumn: string, punchOutColumn: string) => ({
      name,
      sql: `
        SELECT
          CAST(u.id AS TEXT) AS "userId",
          u.user_name AS username,
          ${fullNameExpr} AS "fullName",
          MIN(ar.${punchInColumn}) AS "firstCheckIn",
          MAX(ar.${punchOutColumn}) AS "lastCheckOut",
          COALESCE(
            SUM(
              CASE
                WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NOT NULL
                  THEN ${dialect.timeDiffSeconds(`ar.${punchInColumn}`, `ar.${punchOutColumn}`)}
                ELSE 0
              END
            ),
            0
          ) AS "workedSeconds",
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NULL THEN 1
              ELSE 0
            END
          ) AS "hasOpenPunch",
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NOT NULL THEN 1
              ELSE 0
            END
          ) AS "hasCompletedPunch",
          MAX(
            CASE
              WHEN ar.${punchInColumn} IS NOT NULL AND ar.${punchOutColumn} IS NULL
                THEN ar.${punchInColumn}
              ELSE NULL
            END
          ) AS "latestOpenCheckIn"
        FROM ohrm_attendance_record ar
        INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
        LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
        WHERE ${dialect.date(`ar.${punchInColumn}`)} = $1
        GROUP BY u.id, u.user_name, e.first_name, e.middle_name, e.last_name
        ORDER BY u.user_name ASC
      `,
      params: [],
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
    const idPlaceholders = buildPostgresPlaceholders(input.userIds.length, 1);
    const fromIndex = input.userIds.length + 1;
    const toIndex = input.userIds.length + 2;
    const fullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);
    const attempts = this.buildReportAttempts(
      fullNameExpr,
      idPlaceholders,
      fromIndex,
      toIndex,
    );
    const params = [...input.userIds, range.from, range.to];

    let rows: AttendanceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        const result = await pool.query<AttendanceQueryRow>(attempt.sql, params);
        rows = result.rows;
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapPostgresError(error));
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
    idPlaceholders: string,
    fromIndex: number,
    toIndex: number,
  ): QueryAttempt[] {
    const buildAttempt = (name: string, punchInColumn: string, punchOutColumn: string) => ({
      name,
      sql: `
        SELECT
          CAST(u.id AS TEXT) AS "userId",
          u.user_name AS username,
          ${fullNameExpr} AS "fullName",
          ${dialect.date(`ar.${punchInColumn}`)} AS "attendanceDate",
          ${dialect.time(`ar.${punchInColumn}`)} AS "checkIn",
          ${dialect.time(`ar.${punchOutColumn}`)} AS "checkOut",
          ROUND((${dialect.timeDiffSeconds(`ar.${punchInColumn}`, `ar.${punchOutColumn}`)})::numeric / 3600, 2) AS hours
        FROM ohrm_attendance_record ar
        INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
        LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
        WHERE CAST(u.id AS TEXT) IN (${idPlaceholders})
          AND ${dialect.date(`ar.${punchInColumn}`)} BETWEEN $${fromIndex} AND $${toIndex}
        ORDER BY "attendanceDate" ASC, username ASC
      `,
      params: [],
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
