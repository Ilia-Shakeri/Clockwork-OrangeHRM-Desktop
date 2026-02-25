import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { Input } from "@/app/components/Input";
import { PageHelpButton } from "@/components/PageHelpButton";
import type { ConnectionPayload, DatabaseEngine } from "@/types/api";

function defaultPortForEngine(engine: DatabaseEngine): number {
  if (engine === "postgres") {
    return 5432;
  }

  if (engine === "sqlite") {
    return 0;
  }

  return 3306;
}

const EMPTY_CONNECTION: ConnectionPayload = {
  engine: "mariadb",
  host: "127.0.0.1",
  port: 3306,
  user: "",
  password: "",
  database: "",
  ssl: false,
  sqlitePath: "./data/app.db",
};

export function Connections() {
  const [connection, setConnection] = useState<ConnectionPayload>(EMPTY_CONNECTION);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isSqlite = connection.engine === "sqlite";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiClient.getSettings();
        if (active && response.connection) {
          setConnection(response.connection);
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load connection settings",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const canTest = useMemo(() => {
    if (isSqlite) {
      return connection.sqlitePath.trim().length > 0;
    }

    return (
      connection.host.trim().length > 0 &&
      connection.port > 0 &&
      connection.user.trim().length > 0 &&
      connection.database.trim().length > 0
    );
  }, [connection, isSqlite]);

  const handleTestAndSave = async () => {
    if (!canTest) {
      toast.error(
        isSqlite
          ? "SQLite path is required."
          : "Host, port, user, and database are required.",
      );
      return;
    }

    setTesting(true);
    setStatus(null);

    try {
      await apiClient.connect(connection);
      setStatus({ ok: true, message: "Connection successful. Configuration saved." });
      toast.success("Connected and saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect";
      setStatus({ ok: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">
            Connections
          </h1>
        </div>
        <PageHelpButton
          title="Connections Help"
          overview="Configure the database connection used by users, reports, and live presence."
          steps={[
            "Select database engine and provide connection details.",
            "Click Test Connection and Save to validate and persist settings.",
            "If test fails, review the error message and adjust connection details.",
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Connection Wizard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-[var(--clockwork-gray-700)]">
                  Database Engine
                </label>
                <select
                  value={connection.engine}
                  onChange={(event) => {
                    const nextEngine = event.target.value as DatabaseEngine;
                    setConnection((current) => ({
                      ...current,
                      engine: nextEngine,
                      port: defaultPortForEngine(nextEngine),
                    }));
                  }}
                  disabled={loading || testing}
                  className="w-full rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-3 py-2 text-[var(--clockwork-gray-900)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)] disabled:cursor-not-allowed disabled:bg-[var(--clockwork-bg-tertiary)] disabled:text-[var(--clockwork-gray-500)]"
                >
                  <option value="mariadb">MariaDB (Default)</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>

              {isSqlite ? (
                <Input
                  label="SQLite File Path"
                  value={connection.sqlitePath}
                  onChange={(event) =>
                    setConnection((current) => ({
                      ...current,
                      sqlitePath: event.target.value,
                    }))
                  }
                  placeholder="./data/app.db"
                  disabled={loading || testing}
                />
              ) : (
                <Input
                  label="Database"
                  value={connection.database}
                  onChange={(event) =>
                    setConnection((current) => ({ ...current, database: event.target.value }))
                  }
                  placeholder={connection.engine === "postgres" ? "orangehrm" : "orangehrm_mysql"}
                  disabled={loading || testing}
                />
              )}
            </div>

            {!isSqlite ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Host"
                    value={connection.host}
                    onChange={(event) =>
                      setConnection((current) => ({ ...current, host: event.target.value }))
                    }
                    placeholder="127.0.0.1"
                    disabled={loading || testing}
                  />
                  <Input
                    label="Port"
                    type="text"
                    inputMode="numeric"
                    value={connection.port > 0 ? String(connection.port) : ""}
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onChange={(event) =>
                      setConnection((current) => {
                        const digitsOnly = event.target.value.replace(/[^\d]/g, "");
                        return {
                          ...current,
                          port:
                            digitsOnly.length > 0
                              ? Number(digitsOnly)
                              : defaultPortForEngine(current.engine),
                        };
                      })
                    }
                    placeholder={connection.engine === "postgres" ? "5432" : "3306"}
                    disabled={loading || testing}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="User"
                    value={connection.user}
                    onChange={(event) =>
                      setConnection((current) => ({ ...current, user: event.target.value }))
                    }
                    placeholder={connection.engine === "postgres" ? "postgres" : "orangehrm_user"}
                    disabled={loading || testing}
                  />

                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--clockwork-gray-700)]">
                      SSL
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setConnection((current) => ({ ...current, ssl: !current.ssl }))
                      }
                      disabled={loading || testing}
                      className="inline-flex h-10 items-center rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-3 text-sm text-[var(--clockwork-gray-900)] transition-all hover:border-[var(--clockwork-orange)] disabled:cursor-not-allowed disabled:bg-[var(--clockwork-bg-tertiary)] disabled:text-[var(--clockwork-gray-500)]"
                    >
                      {connection.ssl ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--clockwork-gray-700)]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={connection.password}
                      onChange={(event) =>
                        setConnection((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Database password"
                      disabled={loading || testing}
                      className="w-full rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-3 py-2 pr-10 text-[var(--clockwork-gray-900)] placeholder:text-[var(--clockwork-gray-500)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)] disabled:cursor-not-allowed disabled:bg-[var(--clockwork-bg-tertiary)] disabled:text-[var(--clockwork-gray-500)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading || testing}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--clockwork-orange)] transition-transform duration-200 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 animate-[pulse_0.2s_ease-out]" />
                      ) : (
                        <Eye className="h-4 w-4 animate-[pulse_0.2s_ease-out]" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                disabled={!canTest || testing || loading}
                onClick={handleTestAndSave}
              >
                {testing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Test Connection and Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {status ? (
        <Card
          className={
            status.ok
              ? "border-[var(--clockwork-green)]/40"
              : "border-[var(--clockwork-error)]/40"
          }
        >
          <CardContent>
            <div className="flex items-start gap-3">
              {status.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--clockwork-green)]" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--clockwork-error)]" />
              )}
              <p className="text-sm text-[var(--clockwork-gray-700)]">{status.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-[var(--clockwork-border)] bg-[var(--clockwork-gray-50)]">
        <CardContent>
          <p className="text-sm text-[var(--clockwork-gray-700)]">
            On success, this page persists database connection values in the local machine
            store. The backend API binds to 127.0.0.1 and is never exposed publicly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
