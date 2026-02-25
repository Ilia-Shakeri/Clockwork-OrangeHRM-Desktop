import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Database, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { Input } from "@/app/components/Input";
import type { ConnectionPayload } from "@/types/api";

const EMPTY_CONNECTION: ConnectionPayload = {
  host: "127.0.0.1",
  port: 3306,
  user: "",
  password: "",
  database: "",
};

export function Connections() {
  const [connection, setConnection] = useState<ConnectionPayload>(EMPTY_CONNECTION);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

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
          toast.error(error instanceof Error ? error.message : "Failed to load connection settings");
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
    return (
      connection.host.trim().length > 0 &&
      connection.user.trim().length > 0 &&
      connection.database.trim().length > 0
    );
  }, [connection]);

  const handleTestAndSave = async () => {
    if (!canTest) {
      toast.error("Host, user, and database are required.");
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
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Connections</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Connection Wizard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                type="number"
                value={connection.port}
                onChange={(event) =>
                  setConnection((current) => ({
                    ...current,
                    port: Number(event.target.value) || 3306,
                  }))
                }
                placeholder="3306"
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
                placeholder="orangehrm_user"
                disabled={loading || testing}
              />
              <Input
                label="Database"
                value={connection.database}
                onChange={(event) =>
                  setConnection((current) => ({ ...current, database: event.target.value }))
                }
                placeholder="orangehrm_mysql"
                disabled={loading || testing}
              />
            </div>

            <Input
              label="Password"
              type="password"
              value={connection.password}
              onChange={(event) =>
                setConnection((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Database password"
              disabled={loading || testing}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" disabled={!canTest || testing || loading} onClick={handleTestAndSave}>
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
        <Card className={status.ok ? "border-[var(--clockwork-green)]/40" : "border-[var(--clockwork-error)]/40"}>
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
            On success, this page persists host/user/password/database values in the local machine store. The backend
            API binds to 127.0.0.1 and is never exposed publicly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
