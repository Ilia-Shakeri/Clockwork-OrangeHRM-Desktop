import mysql, {
  type Pool,
  type PoolOptions,
  type RowDataPacket,
} from "mysql2/promise";
import type {
  AppUser,
  ConnectionPayload,
  PresencePayload,
  ReportPayload,
  ReportRequest,
  UserQueryInput,
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
} from "./common";
import { createDialectHelpers } from "./query-builders/dialect";
import type { DbAdapter, DbLogger, QueryAttempt } from "./types";

interface MySqlUserQueryRow extends RowDataPacket {
  id: string | number;
  username: string;
  fullName: string | null;
  email: string | null;
  employeeId: string | number | null;
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

interface AttendanceTableVariant {
  name: string;
  tableName: string;
  userJoinColumn: string;
  punchInColumn: string;
  punchOutColumn: string;
}

interface EmployeeNameVariant {
  name: string;
  fullNameExpr: string;
  employeeJoinClause: string;
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

function summarizeSchemaErrors(schemaErrors: Array<{ attempt: string; reason: string }>): string {
  if (schemaErrors.length === 0) {
    return "No schema diagnostics available.";
  }

  return schemaErrors
    .map((error) => `${error.attempt}: ${error.reason}`)
    .slice(0, 3)
    .join(" | ");
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

  async getUsers(input: UserQueryInput): Promise<AppUser[]> {
    const pool = this.getPool();
    const safeLimit = Math.max(1, Math.min(500, input.limit ?? 200));
    const safeOffset = Math.max(0, Math.min(100000, input.offset ?? 0));
    const normalizedQuery = (input.query ?? "").trim();
    const hasQuery = normalizedQuery.length > 0;
    const like = `%${normalizedQuery}%`;
    const limitClause = dialect.limitOffset("?", "?");

    const buildWhereClause = (
      usernameExpr: string,
      fullNameExpr: string,
      emailExpr: string,
      employeeIdExpr: string,
    ): string => {
      if (!hasQuery) {
        return "";
      }

      return `
        WHERE ${dialect.caseInsensitiveLike(usernameExpr, "?")}
           OR ${dialect.caseInsensitiveLike(fullNameExpr, "?")}
           OR ${dialect.caseInsensitiveLike(emailExpr, "?")}
           OR ${dialect.caseInsensitiveLike(employeeIdExpr, "?")}
      `;
    };

    const paramsFor = (predicateCount: number): unknown[] => {
      if (!hasQuery) {
        return [safeLimit, safeOffset];
      }

      return [...Array.from({ length: predicateCount }, () => like), safeLimit, safeOffset];
    };

    const modernFullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);
    const modernEmailExpr = "NULLIF(TRIM(COALESCE(e.work_email, '')), '')";
    const modernEmployeeIdExpr = "CAST(e.employee_id AS CHAR)";

    const legacyFullNameExpr = dialect.concatSpace([
      "e.emp_firstname",
      "e.emp_middle_name",
      "e.emp_lastname",
    ]);
    const legacyEmailExpr = "NULLIF(TRIM(COALESCE(e.emp_work_email, '')), '')";
    const legacyEmployeeIdExpr = "CAST(e.employee_id AS CHAR)";

    const attempts: QueryAttempt[] = [
      {
        name: "ohrm_user+hs_hr_employee(modern)",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            ${modernFullNameExpr} AS fullName,
            ${modernEmailExpr} AS email,
            ${modernEmployeeIdExpr} AS employeeId
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          ${buildWhereClause("u.user_name", modernFullNameExpr, modernEmailExpr, modernEmployeeIdExpr)}
          ORDER BY u.user_name ASC
          ${limitClause}
        `,
        params: paramsFor(4),
      },
      {
        name: "ohrm_user+hs_hr_employee(legacy)",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            ${legacyFullNameExpr} AS fullName,
            ${legacyEmailExpr} AS email,
            ${legacyEmployeeIdExpr} AS employeeId
          FROM ohrm_user u
          LEFT JOIN hs_hr_employee e ON e.emp_number = u.emp_number
          ${buildWhereClause("u.user_name", legacyFullNameExpr, legacyEmailExpr, legacyEmployeeIdExpr)}
          ORDER BY u.user_name ASC
          ${limitClause}
        `,
        params: paramsFor(4),
      },
      {
        name: "ohrm_user",
        sql: `
          SELECT
            CAST(u.id AS CHAR) AS id,
            u.user_name AS username,
            u.user_name AS fullName,
            NULL AS email,
            NULL AS employeeId
          FROM ohrm_user u
          ${hasQuery ? `WHERE ${dialect.caseInsensitiveLike("u.user_name", "?")}` : ""}
          ORDER BY u.user_name ASC
          ${limitClause}
        `,
        params: hasQuery ? [like, safeLimit, safeOffset] : [safeLimit, safeOffset],
      },
      {
        name: "hs_hr_employee",
        sql: `
          SELECT
            CAST(e.emp_number AS CHAR) AS id,
            CAST(e.employee_id AS CHAR) AS username,
            ${modernFullNameExpr} AS fullName,
            ${modernEmailExpr} AS email,
            CAST(e.employee_id AS CHAR) AS employeeId
          FROM hs_hr_employee e
          ${buildWhereClause("e.employee_id", modernFullNameExpr, modernEmailExpr, "e.employee_id")}
          ORDER BY e.employee_id ASC
          ${limitClause}
        `,
        params: paramsFor(4),
      },
    ];

    const schemaErrors: Array<{ attempt: string; reason: string }> = [];

    for (const attempt of attempts) {
      try {
        const [rows] = await pool.query<MySqlUserQueryRow[]>(attempt.sql, attempt.params);
        return normalizeUsers(rows);
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push({
            attempt: attempt.name,
            reason: error instanceof Error ? error.message : "Schema mismatch",
          });
          continue;
        }

        throw new Error(mapMySqlError(error));
      }
    }

    throw new Error(
      "Unable to load users from OrangeHRM. Verify tables/columns such as " +
        "`ohrm_user.user_name`, `ohrm_user.emp_number`, `hs_hr_employee.emp_number`, " +
        "`hs_hr_employee.employee_id`, name columns, and optional email columns. " +
        summarizeSchemaErrors(schemaErrors),
    );
  }

  async getDailyPresence(dateIso: string): Promise<PresencePayload> {
    const pool = this.getPool();
    const parsedDate = parseIsoDateInput(dateIso);

    if (!parsedDate) {
      throw new Error("Invalid presence date. Expected YYYY-MM-DD.");
    }

    const normalizedDate = toLocalIsoDate(parsedDate);

    const attempts = this.buildPresenceAttempts(normalizedDate);

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
      const summarizedAttempts = schemaErrors.slice(0, 4).join(", ");
      const extraAttempts =
        schemaErrors.length > 4 ? `, ... (${schemaErrors.length} attempts)` : "";
      throw new Error(
        `Attendance schema is unsupported. Tried: ${summarizedAttempts}${extraAttempts}.`,
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

  private buildAttendanceTableVariants(): AttendanceTableVariant[] {
    return [
      {
        name: "attendance_record_user_time",
        tableName: "ohrm_attendance_record",
        userJoinColumn: "employee_id",
        punchInColumn: "punch_in_user_time",
        punchOutColumn: "punch_out_user_time",
      },
      {
        name: "attendance_record_utc_time",
        tableName: "ohrm_attendance_record",
        userJoinColumn: "employee_id",
        punchInColumn: "punch_in_utc_time",
        punchOutColumn: "punch_out_utc_time",
      },
      {
        name: "attendance_record_time",
        tableName: "ohrm_attendance_record",
        userJoinColumn: "employee_id",
        punchInColumn: "punch_in_time",
        punchOutColumn: "punch_out_time",
      },
      {
        name: "attendance_record_user_time_by_emp_number",
        tableName: "ohrm_attendance_record",
        userJoinColumn: "emp_number",
        punchInColumn: "punch_in_user_time",
        punchOutColumn: "punch_out_user_time",
      },
      {
        name: "hs_hr_attendance_in_out_time",
        tableName: "hs_hr_attendance",
        userJoinColumn: "employee_id",
        punchInColumn: "in_time",
        punchOutColumn: "out_time",
      },
      {
        name: "hs_hr_attendance_in_out_time_by_emp_number",
        tableName: "hs_hr_attendance",
        userJoinColumn: "emp_number",
        punchInColumn: "in_time",
        punchOutColumn: "out_time",
      },
    ];
  }

  private buildEmployeeNameVariants(joinColumn: string): EmployeeNameVariant[] {
    const modernFullNameExpr = dialect.concatSpace([
      "e.first_name",
      "e.middle_name",
      "e.last_name",
    ]);
    const legacyFullNameExpr = dialect.concatSpace([
      "e.emp_firstname",
      "e.emp_middle_name",
      "e.emp_lastname",
    ]);
    const employeeJoinClause = `LEFT JOIN hs_hr_employee e ON e.emp_number = ar.${joinColumn}`;

    return [
      {
        name: "employee_name_modern",
        fullNameExpr: modernFullNameExpr,
        employeeJoinClause,
      },
      {
        name: "employee_name_legacy",
        fullNameExpr: legacyFullNameExpr,
        employeeJoinClause,
      },
      {
        name: "user_name_only",
        fullNameExpr: "u.user_name",
        employeeJoinClause: "",
      },
    ];
  }

  private buildPresenceAttempts(dateIso: string): QueryAttempt[] {
    const attempts: QueryAttempt[] = [];

    for (const tableVariant of this.buildAttendanceTableVariants()) {
      for (const nameVariant of this.buildEmployeeNameVariants(tableVariant.userJoinColumn)) {
        attempts.push({
          name: `${tableVariant.name}+${nameVariant.name}`,
          sql: `
            SELECT
              CAST(u.id AS CHAR) AS userId,
              u.user_name AS username,
              ${nameVariant.fullNameExpr} AS fullName,
              MIN(ar.${tableVariant.punchInColumn}) AS firstCheckIn,
              MAX(ar.${tableVariant.punchOutColumn}) AS lastCheckOut,
              COALESCE(
                SUM(
                  CASE
                    WHEN ar.${tableVariant.punchInColumn} IS NOT NULL AND ar.${tableVariant.punchOutColumn} IS NOT NULL
                      THEN ${dialect.timeDiffSeconds(`ar.${tableVariant.punchInColumn}`, `ar.${tableVariant.punchOutColumn}`)}
                    ELSE 0
                  END
                ),
                0
              ) AS workedSeconds,
              MAX(
                CASE
                  WHEN ar.${tableVariant.punchInColumn} IS NOT NULL AND ar.${tableVariant.punchOutColumn} IS NULL THEN 1
                  ELSE 0
                END
              ) AS hasOpenPunch,
              MAX(
                CASE
                  WHEN ar.${tableVariant.punchInColumn} IS NOT NULL AND ar.${tableVariant.punchOutColumn} IS NOT NULL THEN 1
                  ELSE 0
                END
              ) AS hasCompletedPunch,
              MAX(
                CASE
                  WHEN ar.${tableVariant.punchInColumn} IS NOT NULL AND ar.${tableVariant.punchOutColumn} IS NULL
                    THEN ar.${tableVariant.punchInColumn}
                  ELSE NULL
                END
              ) AS latestOpenCheckIn
            FROM ${tableVariant.tableName} ar
            INNER JOIN ohrm_user u ON u.emp_number = ar.${tableVariant.userJoinColumn}
            ${nameVariant.employeeJoinClause}
            WHERE ${dialect.date(`ar.${tableVariant.punchInColumn}`)} = ?
            GROUP BY u.id, u.user_name, fullName
            ORDER BY u.user_name ASC
          `,
          params: [dateIso],
        });
      }
    }

    return attempts;
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
    const attempts = this.buildReportAttempts(placeholders, input, range);

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
      const summarizedAttempts = schemaErrors.slice(0, 4).join(", ");
      const extraAttempts =
        schemaErrors.length > 4 ? `, ... (${schemaErrors.length} attempts)` : "";
      throw new Error(
        `Attendance schema is unsupported. Tried: ${summarizedAttempts}${extraAttempts}.`,
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
    placeholders: string,
    input: ReportRequest,
    range: { from: string; to: string },
  ): QueryAttempt[] {
    const attempts: QueryAttempt[] = [];

    for (const tableVariant of this.buildAttendanceTableVariants()) {
      for (const nameVariant of this.buildEmployeeNameVariants(tableVariant.userJoinColumn)) {
        attempts.push({
          name: `${tableVariant.name}+${nameVariant.name}`,
          sql: `
            SELECT
              CAST(u.id AS CHAR) AS userId,
              u.user_name AS username,
              ${nameVariant.fullNameExpr} AS fullName,
              ${dialect.date(`ar.${tableVariant.punchInColumn}`)} AS attendanceDate,
              ${dialect.time(`ar.${tableVariant.punchInColumn}`)} AS checkIn,
              ${dialect.time(`ar.${tableVariant.punchOutColumn}`)} AS checkOut,
              ROUND(${dialect.timeDiffSeconds(`ar.${tableVariant.punchInColumn}`, `ar.${tableVariant.punchOutColumn}`)} / 3600, 2) AS hours
            FROM ${tableVariant.tableName} ar
            INNER JOIN ohrm_user u ON u.emp_number = ar.${tableVariant.userJoinColumn}
            ${nameVariant.employeeJoinClause}
            WHERE u.id IN (${placeholders})
              AND ${dialect.date(`ar.${tableVariant.punchInColumn}`)} BETWEEN ? AND ?
            ORDER BY attendanceDate ASC, username ASC
          `,
          params: [...input.userIds, range.from, range.to],
        });
      }
    }

    return attempts;
  }
}
