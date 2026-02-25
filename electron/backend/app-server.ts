import type { Server } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { z } from "zod";
import { MySqlConnectionService } from "./db";
import type { PresencePayload, ReportPayload } from "./dtos";
import { buildCsv, buildPdf } from "./exporters";
import { PythonEnhancer } from "./python";
import {
  addExportHistory,
  type ConfigStore,
  getConnection,
  getExportHistory,
  getSettings,
  saveConnection,
  updateSettings,
} from "./store";

const connectionSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1, "User is required"),
  password: z.string(),
  database: z.string().min(1, "Database is required"),
});

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
  bulkScanMode: z.enum(["combined", "per-user"]),
});

const usersResolveSchema = z.object({
  usernames: z.array(z.string().min(1)).max(1000),
});

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
  }),
  savePath: z.string().min(1),
});

interface StartApiServerOptions {
  store: ConfigStore;
  appVersion: string;
  isDev: boolean;
  pythonScriptPath: string;
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

  const dbService = new MySqlConnectionService((message, details) => {
    logger(message, details);
  });
  await dbService.initialize(getConnection(options.store));

  const python = new PythonEnhancer(options.pythonScriptPath);
  python.detect();

  api.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      version: options.appVersion,
      uptime: Number(process.uptime().toFixed(3)),
    });
  });

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
      const query = typeof req.query.query === "string" ? req.query.query : "";
      const users = await dbService.searchUsers(query, 20);
      res.json({ users });
    }),
  );

  api.post(
    "/api/users/resolve",
    createRouteHandler(async (req, res) => {
      const parsed = usersResolveSchema.parse(req.body);
      const settings = getSettings(options.store);

      let usernameRegex = /^[a-zA-Z0-9._-]+$/;
      try {
        usernameRegex = new RegExp(settings.usernameValidationRegex);
      } catch {
        usernameRegex = /^[a-zA-Z0-9._-]+$/;
      }

      const validated = parsed.usernames.map((username) => username.trim()).filter(Boolean);
      const uniqueUsernames = Array.from(new Set(validated));
      const invalidUsernames = uniqueUsernames.filter(
        (username) => !usernameRegex.test(username),
      );
      const validUsernames = uniqueUsernames.filter((username) => usernameRegex.test(username));

      const resolved = await dbService.resolveUsersByUsername(validUsernames);
      const invalidResults = invalidUsernames.map((username) => ({
        username,
        status: "invalid" as const,
      }));

      res.json({
        users: [...resolved, ...invalidResults],
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
          : await buildPdf(parsed.reportPayload, parsed.meta);

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
