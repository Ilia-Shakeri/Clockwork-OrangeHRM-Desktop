import type { ConnectionPayload } from "../dtos";

export const DEFAULT_SQLITE_PATH = "./data/app.db";
const DEFAULT_HOST = "127.0.0.1";

const CONNECTION_ENV_KEYS = [
  "DB_ENGINE",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_SSL",
  "SQLITE_PATH",
] as const;

function normalizeEngine(value: unknown): ConnectionPayload["engine"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "mariadb" ||
    normalized === "mysql" ||
    normalized === "postgres" ||
    normalized === "sqlite"
  ) {
    return normalized;
  }

  return "mariadb";
}

function normalizeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return false;
}

function normalizePort(
  engine: ConnectionPayload["engine"],
  value: unknown,
): number {
  const fallback = defaultPortForEngine(engine);
  const asNumber =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(asNumber)) {
    return fallback;
  }

  const normalized = Math.trunc(asNumber);
  if (engine === "sqlite") {
    return 0;
  }

  if (normalized < 1 || normalized > 65535) {
    return fallback;
  }

  return normalized;
}

export function defaultPortForEngine(engine: ConnectionPayload["engine"]): number {
  if (engine === "postgres") {
    return 5432;
  }

  if (engine === "sqlite") {
    return 0;
  }

  return 3306;
}

export function normalizeConnectionPayload(
  connection: Partial<ConnectionPayload> | null | undefined,
): ConnectionPayload | null {
  if (!connection || typeof connection !== "object") {
    return null;
  }

  const engine = normalizeEngine(connection.engine);
  const normalized: ConnectionPayload = {
    engine,
    host: normalizeText(connection.host, DEFAULT_HOST),
    port: normalizePort(engine, connection.port),
    user: normalizeText(connection.user),
    password: typeof connection.password === "string" ? connection.password : "",
    database: normalizeText(connection.database),
    ssl: normalizeBoolean(connection.ssl),
    sqlitePath: normalizeText(connection.sqlitePath, DEFAULT_SQLITE_PATH),
  };

  if (engine === "sqlite") {
    return {
      ...normalized,
      port: 0,
      sqlitePath: normalized.sqlitePath || DEFAULT_SQLITE_PATH,
      host: normalized.host || DEFAULT_HOST,
    };
  }

  return {
    ...normalized,
    host: normalized.host || DEFAULT_HOST,
    port: normalizePort(engine, normalized.port),
  };
}

export function hasEnvironmentConnectionConfig(): boolean {
  return CONNECTION_ENV_KEYS.some((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function resolveEnvironmentConnection(): ConnectionPayload | null {
  if (!hasEnvironmentConnectionConfig()) {
    return null;
  }

  const engine = normalizeEngine(process.env.DB_ENGINE);
  const rawPort = process.env.DB_PORT;
  const parsedPort = rawPort && rawPort.trim().length > 0 ? Number(rawPort) : undefined;
  const ssl = normalizeBoolean(process.env.DB_SSL);

  return normalizeConnectionPayload({
    engine,
    host: process.env.DB_HOST,
    port: parsedPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
    sqlitePath: process.env.SQLITE_PATH,
  });
}
