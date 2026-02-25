import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
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

  async searchUsers(query: string, limit = 20): Promise<UserLookupResult[]> {
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
            CAST(u.id AS TEXT) AS id,
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
            CAST(e.emp_number AS TEXT) AS id,
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
        const rows = this.runAll<UserQueryRow>(attempt.sql, attempt.params);
        return normalizeUsers(rows);
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapSqliteError(error));
      }
    }

    throw new Error(
      `Unable to read users because the OrangeHRM schema did not match expected tables (${schemaErrors.join(", ")}).`,
    );
  }

  async resolveUsersByUsername(usernames: string[]): Promise<ResolvedUserResult[]> {
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
            CAST(u.id AS TEXT) AS id,
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
            CAST(u.id AS TEXT) AS id,
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
        const rows = this.runAll<UserQueryRow>(attempt.sql, attempt.params);
        matchedUsers = normalizeUsers(rows);
        break;
      } catch (error) {
        if (isSchemaError(error)) {
          schemaErrors.push(attempt.name);
          continue;
        }

        throw new Error(mapSqliteError(error));
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
