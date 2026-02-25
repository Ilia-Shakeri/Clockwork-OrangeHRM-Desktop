import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
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
import { DEFAULT_SQLITE_PATH } from "./config";
import { createDialectHelpers } from "./query-builders/dialect";
import type {
  AttendanceQueryRow,
  DbAdapter,
  PresenceQueryRow,
  QueryAttempt,
  UserQueryRow,
} from "./types";

type SqliteDatabase = DatabaseSync;

const dialect = createDialectHelpers("sqlite");

function resolveSqlitePath(connection: ConnectionPayload): string {
  const configured = connection.sqlitePath.trim() || DEFAULT_SQLITE_PATH;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function isSchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("no such table") ||
    error.message.includes("no such column") ||
    error.message.includes("near")
  );
}

function mapSqliteError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown database error";
  }

  if (error.message.includes("unable to open database file")) {
    return "Unable to open SQLite database file. Verify sqlite path.";
  }

  return error.message;
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

export class SqliteAdapter implements DbAdapter {
  private db: SqliteDatabase | null = null;

  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    this.db.close();
    this.db = null;
  }

  async connect(connection: ConnectionPayload): Promise<void> {
    if (connection.engine !== "sqlite") {
      throw new Error("Invalid engine for sqlite adapter.");
    }

    const sqlitePath = resolveSqlitePath(connection);
    await fs.mkdir(path.dirname(sqlitePath), { recursive: true });

    let nextDb: SqliteDatabase | null = null;

    try {
      nextDb = new DatabaseSync(sqlitePath);
      nextDb.prepare("SELECT 1").get();
    } catch (error) {
      if (nextDb) {
        nextDb.close();
      }

      throw new Error(mapSqliteError(error));
    }

    const previousDb = this.db;
    this.db = nextDb;

    if (previousDb) {
      previousDb.close();
    }
  }

  async ping(): Promise<void> {
    const db = this.getDb();

    try {
      db.prepare("SELECT 1").get();
    } catch (error) {
      throw new Error(mapSqliteError(error));
    }
  }

  private getDb(): SqliteDatabase {
    if (!this.db) {
      throw new Error(NO_DB_CONNECTION_ERROR);
    }

    return this.db;
  }

  private runAll<T>(sql: string, params: unknown[]): T[] {
    const db = this.getDb();
    return db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
  }

  async getUsers(input: UserQueryInput): Promise<AppUser[]> {
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
    const modernEmployeeIdExpr = "CAST(e.employee_id AS TEXT)";

    const legacyFullNameExpr = dialect.concatSpace([
      "e.emp_firstname",
      "e.emp_middle_name",
      "e.emp_lastname",
    ]);
    const legacyEmailExpr = "NULLIF(TRIM(COALESCE(e.emp_work_email, '')), '')";
    const legacyEmployeeIdExpr = "CAST(e.employee_id AS TEXT)";

    const attempts: QueryAttempt[] = [
      {
        name: "ohrm_user+hs_hr_employee(modern)",
        sql: `
          SELECT
            CAST(u.id AS TEXT) AS id,
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
            CAST(u.id AS TEXT) AS id,
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
            CAST(u.id AS TEXT) AS id,
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
            CAST(e.emp_number AS TEXT) AS id,
            CAST(e.employee_id AS TEXT) AS username,
            ${modernFullNameExpr} AS fullName,
            ${modernEmailExpr} AS email,
            CAST(e.employee_id AS TEXT) AS employeeId
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
        const rows = this.runAll<UserQueryRow>(attempt.sql, attempt.params);
        return normalizeUsers(rows);
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push({
            attempt: attempt.name,
            reason: error instanceof Error ? error.message : "Schema mismatch",
          });
          continue;
        }

        throw new Error(mapSqliteError(error));
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

    let rows: PresenceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        rows = this.runAll<PresenceQueryRow>(attempt.sql, attempt.params);
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapSqliteError(error));
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
          CAST(u.id AS TEXT) AS userId,
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
    const attempts = this.buildReportAttempts(fullNameExpr, placeholders, range, input.userIds);

    let rows: AttendanceQueryRow[] = [];
    const schemaErrors: string[] = [];

    for (const attempt of attempts) {
      try {
        rows = this.runAll<AttendanceQueryRow>(attempt.sql, attempt.params);
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapSqliteError(error));
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
    range: { from: string; to: string },
    userIds: string[],
  ): QueryAttempt[] {
    const buildAttempt = (name: string, punchInColumn: string, punchOutColumn: string) => ({
      name,
      sql: `
        SELECT
          CAST(u.id AS TEXT) AS userId,
          u.user_name AS username,
          ${fullNameExpr} AS fullName,
          ${dialect.date(`ar.${punchInColumn}`)} AS attendanceDate,
          ${dialect.time(`ar.${punchInColumn}`)} AS checkIn,
          ${dialect.time(`ar.${punchOutColumn}`)} AS checkOut,
          ROUND((${dialect.timeDiffSeconds(`ar.${punchInColumn}`, `ar.${punchOutColumn}`)}) / 3600.0, 2) AS hours
        FROM ohrm_attendance_record ar
        INNER JOIN ohrm_user u ON u.emp_number = ar.employee_id
        LEFT JOIN hs_hr_employee e ON e.emp_number = ar.employee_id
        WHERE CAST(u.id AS TEXT) IN (${placeholders})
          AND ${dialect.date(`ar.${punchInColumn}`)} BETWEEN ? AND ?
        ORDER BY attendanceDate ASC, username ASC
      `,
      params: [...userIds, range.from, range.to],
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
