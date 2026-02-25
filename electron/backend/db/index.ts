import type {
  AppUser,
  ConnectionPayload,
  PresencePayload,
  ReportPayload,
  ReportRequest,
  UserQueryInput,
} from "../dtos";
import { NO_DB_CONNECTION_ERROR } from "./common";
import {
  defaultPortForEngine,
  DEFAULT_SQLITE_PATH,
  normalizeConnectionPayload,
  resolveEnvironmentConnection,
} from "./config";
import { MySqlMariaDbAdapter } from "./mysql-mariadb";
import { PostgresAdapter } from "./postgres";
import { SqliteAdapter } from "./sqlite";
import type { DbAdapter, DbClient, DbConnectionInfo, DbLogger } from "./types";

class MultiDbClient implements DbClient {
  private adapter: DbAdapter | null = null;
  private connection: ConnectionPayload | null = null;

  constructor(private readonly logger: DbLogger) {}

  async close(): Promise<void> {
    if (!this.adapter) {
      return;
    }

    await this.adapter.close();
    this.adapter = null;
    this.connection = null;
  }

  async initialize(connection: ConnectionPayload | null): Promise<void> {
    const normalizedStored = normalizeConnectionPayload(connection);
    const normalizedEnv = resolveEnvironmentConnection();
    const initialConnection = normalizedStored ?? normalizedEnv;

    if (!initialConnection) {
      return;
    }

    try {
      await this.setConnection(initialConnection);
    } catch (error) {
      this.logger("Stored connection failed to initialize", error);
    }
  }

  async testConnection(connection: ConnectionPayload): Promise<void> {
    const normalized = normalizeConnectionPayload(connection);
    if (!normalized) {
      throw new Error("Invalid connection payload.");
    }

    const adapter = this.createAdapter(normalized);

    try {
      await adapter.connect(normalized);
      await adapter.ping();
    } finally {
      await adapter.close().catch(() => undefined);
    }
  }

  async setConnection(connection: ConnectionPayload): Promise<void> {
    const normalized = normalizeConnectionPayload(connection);
    if (!normalized) {
      throw new Error("Invalid connection payload.");
    }

    const candidateAdapter = this.createAdapter(normalized);

    try {
      await candidateAdapter.connect(normalized);
      await candidateAdapter.ping();
    } catch (error) {
      await candidateAdapter.close().catch(() => undefined);
      throw error;
    }

    const previousAdapter = this.adapter;
    this.adapter = candidateAdapter;
    this.connection = normalized;

    if (previousAdapter) {
      await previousAdapter.close();
    }
  }

  async ping(): Promise<void> {
    const adapter = this.getAdapter();
    await adapter.ping();
  }

  getConnectionInfo(): DbConnectionInfo | null {
    if (!this.connection) {
      return null;
    }

    return {
      engine: this.connection.engine,
      dbName:
        this.connection.engine === "sqlite"
          ? this.connection.sqlitePath
          : this.connection.database,
    };
  }

  async getUsers(input: UserQueryInput): Promise<AppUser[]> {
    const adapter = this.getAdapter();
    return adapter.getUsers(input);
  }

  async getDailyPresence(dateIso: string): Promise<PresencePayload> {
    const adapter = this.getAdapter();
    return adapter.getDailyPresence(dateIso);
  }

  async buildReport(input: ReportRequest): Promise<ReportPayload> {
    const adapter = this.getAdapter();
    return adapter.buildReport(input);
  }

  private getAdapter(): DbAdapter {
    if (!this.adapter) {
      throw new Error(NO_DB_CONNECTION_ERROR);
    }

    return this.adapter;
  }

  private createAdapter(connection: ConnectionPayload): DbAdapter {
    if (connection.engine === "postgres") {
      return new PostgresAdapter();
    }

    if (connection.engine === "sqlite") {
      return new SqliteAdapter();
    }

    return new MySqlMariaDbAdapter(connection.engine, this.logger);
  }
}

export function createDbClient(logger: DbLogger = () => undefined): DbClient {
  return new MultiDbClient(logger);
}

export {
  defaultPortForEngine,
  DEFAULT_SQLITE_PATH,
  normalizeConnectionPayload,
  resolveEnvironmentConnection,
};

export type { DbClient } from "./types";
