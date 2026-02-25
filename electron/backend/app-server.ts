// Author: Ilia Shakeri
import type { Server } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { z } from "zod";
import {
  createDbClient,
  defaultPortForEngine,
  DEFAULT_SQLITE_PATH,
} from "./db/index";
import type { PresencePayload, ReportPayload, UserGroup } from "./dtos";
import { buildCsv, buildPdf } from "./exporters";
import { PythonEnhancer } from "./python";
import {
  addExportHistory,
  clearExportHistory,
  type ConfigStore,
  getConnection,
  getExportHistory,
  getSettings,
  getUserGroups,
  removeExportHistoryByIds,
  replaceUserGroups,
  saveConnection,
  updateSettings,
} from "./store";

const dbEngineSchema = z.enum(["mariadb", "mysql", "postgres", "sqlite"]);

const connectionSchema = z
  .object({
    engine: dbEngineSchema.default("mariadb"),
    host: z.string().trim().default("127.0.0.1"),
    port: z.coerce.number().int().min(0).max(65535).optional(),
    user: z.string().trim().default(""),
    password: z.string().default(""),
    database: z.string().trim().default(""),
    ssl: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .transform((value) => value === true || value === "true")
      .default(false),
    sqlitePath: z.string().trim().default(DEFAULT_SQLITE_PATH),
  })
  .superRefine((value, context) => {
    if (value.engine === "sqlite") {
      if (!value.sqlitePath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SQLite path is required.",
          path: ["sqlitePath"],
        });
      }

      return;
    }

    if (!value.host) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Host is required.",
        path: ["host"],
      });
    }

    const resolvedPort = value.port ?? defaultPortForEngine(value.engine);
    if (resolvedPort < 1 || resolvedPort > 65535) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Port must be between 1 and 65535.",
        path: ["port"],
      });
    }

    if (!value.user) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User is required.",
        path: ["user"],
      });
    }

    if (!value.database) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Database is required.",
        path: ["database"],
      });
    }
  })
  .transform((value) => ({
    engine: value.engine,
    host: value.host || "127.0.0.1",
    port:
      value.engine === "sqlite"
        ? 0
        : value.port ?? defaultPortForEngine(value.engine),
    user: value.user,
    password: value.password,
    database: value.database,
    ssl: value.ssl,
    sqlitePath: value.sqlitePath || DEFAULT_SQLITE_PATH,
  }));

const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]),
  defaultExportFormat: z.enum(["pdf", "csv"]),
  defaultDatePreset: z.enum(["current", "last", "payroll-cycle", "custom"]),
  defaultCalendar: z.enum(["gregorian", "shamsi"]),
  defaultPresenceRefreshSeconds: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(120),
    z.literal(300),
  ]),
  usernameValidationRegex: z.string().min(1),
});

const usersQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional(),
});

const userGroupCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  memberIds: z.array(z.string().trim().min(1)).max(20000).default([]),
});

const userGroupUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.union([z.string().trim().max(500), z.null()]).optional(),
    memberIds: z.array(z.string().trim().min(1)).max(20000).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.memberIds !== undefined,
    "At least one field must be provided for update.",
  );

const reportRequestSchema = z.object({
  userIds: z.array(z.string().min(1)).max(1000),
  dateRange: z.object({
    preset: z.enum(["current", "last", "payroll-cycle", "custom"]),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

const presenceQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => isValidIsoDate(value), "Invalid date. Expected YYYY-MM-DD.")
    .optional(),
});

const reportPayloadSchema: z.ZodType<ReportPayload> = z.object({
  rows: z.array(
    z.object({
      userId: z.string(),
      username: z.string(),
      fullName: z.string(),
      date: z.string(),
      checkIn: z.string().nullable(),
      checkOut: z.string().nullable(),
      hours: z.number(),
    }),
  ),
  totals: z.object({
    hours: z.number(),
    records: z.number(),
    users: z.number(),
  }),
});

const presencePayloadSchema: z.ZodType<PresencePayload> = z.object({
  presenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totals: z.object({
    inside: z.number(),
    out: z.number(),
    totalSeen: z.number(),
  }),
  rows: z.array(
    z.object({
      userId: z.string(),
      username: z.string(),
      fullName: z.string(),
      firstCheckIn: z.string().nullable(),
      lastCheckOut: z.string().nullable(),
      status: z.enum(["inside", "out", "unknown"]),
      workedHours: z.number(),
      sinceCheckInMinutes: z.number().nullable().optional(),
    }),
  ),
});

const exportSchema = z.object({
  format: z.enum(["pdf", "csv"]),
  reportPayload: reportPayloadSchema,
  meta: z.object({
    title: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    userDisplayName: z.string().trim().min(1).optional(),
    userDisplayMap: z.record(z.string(), z.string().trim().min(1)).optional(),
  }),
  savePath: z.string().min(1),
});

const exportHistoryDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).max(500),
});

interface StartApiServerOptions {
  store: ConfigStore;
  appVersion: string;
  isDev: boolean;
  pythonScriptPath: string;
  mainLogoPath?: string;
  logger?: (message: string, details?: unknown) => void;
}

export interface StartedApiServer {
  port: number;
  stop: () => Promise<void>;
}

function createRouteHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMemberIds(memberIds: string[]): string[] {
  return Array.from(new Set(memberIds.map((memberId) => memberId.trim()).filter(Boolean)));
}

function sortGroups(groups: UserGroup[]): UserGroup[] {
  return [...groups].sort((left, right) => left.name.localeCompare(right.name));
}

export async function startLocalApiServer(
  options: StartApiServerOptions,
): Promise<StartedApiServer> {
  const logger = options.logger ?? (() => undefined);
  const api = express();

  api.use(
    cors({
      origin: (_origin, callback) => callback(null, true),
    }),
  );
  api.use(express.json({ limit: "10mb" }));

  if (options.isDev) {
    api.use((req, res, next) => {
      const started = Date.now();
      res.on("finish", () => {
        logger(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`);
      });
      next();
    });
  }

  const dbService = createDbClient((message, details) => {
    logger(message, details);
  });
  await dbService.initialize(getConnection(options.store));

  const python = new PythonEnhancer(options.pythonScriptPath);
  python.detect();

  api.get(
    "/api/health",
    createRouteHandler(async (_req, res) => {
      const connectionInfo = dbService.getConnectionInfo();
      let latencyMs: number | null = null;

      if (connectionInfo) {
        const startedAt = Date.now();
        try {
          await dbService.ping();
          latencyMs = Math.max(1, Date.now() - startedAt);
        } catch (error) {
          logger("Database ping failed", error);
          latencyMs = null;
        }
      }

      res.json({
        ok: true,
        version: options.appVersion,
        uptime: Number(process.uptime().toFixed(3)),
        engine: connectionInfo?.engine ?? null,
        dbName: connectionInfo?.dbName ?? null,
        latencyMs,
      });
    }),
  );

  api.get("/api/settings", (_req, res) => {
    res.json({
      settings: getSettings(options.store),
      connection: getConnection(options.store),
    });
  });

  api.post(
    "/api/settings",
    createRouteHandler(async (req, res) => {
      const parsed = settingsSchema.parse(req.body);
      const saved = updateSettings(options.store, parsed);
      res.json({ settings: saved });
    }),
  );

  api.post(
    "/api/connect",
    createRouteHandler(async (req, res) => {
      const parsed = connectionSchema.parse(req.body);
      await dbService.setConnection(parsed);
      saveConnection(options.store, parsed);
      res.json({ ok: true });
    }),
  );

  api.get(
    "/api/users",
    createRouteHandler(async (req, res) => {
      const parsed = usersQuerySchema.parse({
        query: typeof req.query.query === "string" ? req.query.query : undefined,
        limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
        offset: typeof req.query.offset === "string" ? req.query.offset : undefined,
      });
      const users = await dbService.getUsers({
        query: parsed.query ?? "",
        limit: parsed.limit ?? 200,
        offset: parsed.offset ?? 0,
      });
      res.json({ users });
    }),
  );

  api.get("/api/user-groups", (_req, res) => {
    res.json({
      groups: sortGroups(getUserGroups(options.store)),
    });
  });

  api.post(
    "/api/user-groups",
    createRouteHandler(async (req, res) => {
      const parsed = userGroupCreateSchema.parse(req.body);
      const previousGroups = getUserGroups(options.store);
      const now = new Date().toISOString();
      const nextGroup: UserGroup = {
        id: randomUUID(),
        name: parsed.name,
        description: parsed.description?.trim() || undefined,
        memberIds: normalizeMemberIds(parsed.memberIds),
        createdAt: now,
        updatedAt: now,
      };

      const groups = replaceUserGroups(options.store, [...previousGroups, nextGroup]);
      res.status(201).json({
        group: nextGroup,
        groups: sortGroups(groups),
      });
    }),
  );

  api.patch(
    "/api/user-groups/:groupId",
    createRouteHandler(async (req, res) => {
      const groupId = z.string().uuid().parse(req.params.groupId);
      const parsed = userGroupUpdateSchema.parse(req.body);
      const previousGroups = getUserGroups(options.store);
      const index = previousGroups.findIndex((group) => group.id === groupId);

      if (index < 0) {
        res.status(404).json({ ok: false, error: "Group not found." });
        return;
      }

      const current = previousGroups[index];
      const nextGroup: UserGroup = {
        ...current,
        name: parsed.name ?? current.name,
        description:
          parsed.description === null
            ? undefined
            : (parsed.description ?? current.description),
        memberIds:
          parsed.memberIds !== undefined
            ? normalizeMemberIds(parsed.memberIds)
            : current.memberIds,
        updatedAt: new Date().toISOString(),
      };

      const nextGroups = [...previousGroups];
      nextGroups[index] = nextGroup;
      const groups = replaceUserGroups(options.store, nextGroups);
      res.json({
        group: nextGroup,
        groups: sortGroups(groups),
      });
    }),
  );

  api.delete(
    "/api/user-groups/:groupId",
    createRouteHandler(async (req, res) => {
      const groupId = z.string().uuid().parse(req.params.groupId);
      const previousGroups = getUserGroups(options.store);
      const filteredGroups = previousGroups.filter((group) => group.id !== groupId);

      if (filteredGroups.length === previousGroups.length) {
        res.status(404).json({ ok: false, error: "Group not found." });
        return;
      }

      const groups = replaceUserGroups(options.store, filteredGroups);
      res.json({
        ok: true,
        groups: sortGroups(groups),
      });
    }),
  );

  api.post(
    "/api/reports",
    createRouteHandler(async (req, res) => {
      const parsed = reportRequestSchema.parse(req.body);
      const report = await dbService.buildReport(parsed);
      res.json(report);
    }),
  );

  api.get(
    "/api/presence",
    createRouteHandler(async (req, res) => {
      const parsedQuery = presenceQuerySchema.parse({
        date: typeof req.query.date === "string" ? req.query.date : undefined,
      });
      const dateIso = parsedQuery.date ?? toLocalIsoDate(new Date());
      const payload = await dbService.getDailyPresence(dateIso);
      res.json(presencePayloadSchema.parse(payload));
    }),
  );

  api.post(
    "/api/export",
    createRouteHandler(async (req, res) => {
      const parsed = exportSchema.parse(req.body);
      const savePath = normalizePath(parsed.savePath);
      await fs.mkdir(path.dirname(savePath), { recursive: true });

      const content =
        parsed.format === "csv"
          ? buildCsv(parsed.reportPayload, parsed.meta)
          : await buildPdf(parsed.reportPayload, parsed.meta, {
              logoPath: options.mainLogoPath,
            });

      await fs.writeFile(savePath, content);

      const historyItem = {
        id: randomUUID(),
        format: parsed.format,
        title: parsed.meta.title,
        from: parsed.meta.from,
        to: parsed.meta.to,
        createdAt: new Date().toISOString(),
        filePath: savePath,
        rows: parsed.reportPayload.rows.length,
        totalHours: parsed.reportPayload.totals.hours,
      };

      addExportHistory(options.store, historyItem);

      res.json({
        ok: true,
        filePath: savePath,
        bytes: content.byteLength,
        historyItem,
      });
    }),
  );

  api.get("/api/exports/history", (_req, res) => {
    res.json({
      history: getExportHistory(options.store),
    });
  });

  api.post(
    "/api/exports/history/delete",
    createRouteHandler(async (req, res) => {
      const parsed = exportHistoryDeleteSchema.parse(req.body);
      const history = removeExportHistoryByIds(options.store, parsed.ids);
      res.json({
        ok: true,
        history,
      });
    }),
  );

  api.delete("/api/exports/history", (_req, res) => {
    const history = clearExportHistory(options.store);
    res.json({
      ok: true,
      history,
    });
  });

  api.get("/api/python/status", (_req, res) => {
    res.json(python.getStatus());
  });

  api.post(
    "/api/python/summary",
    createRouteHandler(async (req, res) => {
      const reportPayload = reportPayloadSchema.parse(req.body);
      const summary = await python.generateSummary(reportPayload);
      res.json(summary);
    }),
  );

  api.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        ok: false,
        error: error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    logger("API error", { error });

    res.status(500).json({
      ok: false,
      error: message,
    });
  });

  const server = await new Promise<Server>((resolve) => {
    const started = api.listen(0, "127.0.0.1", () => resolve(started));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine API server port");
  }

  const stop = async () => {
    await dbService.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return {
    port: address.port,
    stop,
  };
}
