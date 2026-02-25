import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Cable, Download, FileText, HeartPulse, User, Users } from "lucide-react";
import { apiClient } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import type { ExportHistoryItem, HealthResponse, SettingsResponse } from "@/types/api";
import { formatDateTime } from "@/lib/helpers";

export function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [healthResponse, settingsResponse, historyResponse] = await Promise.all([
          apiClient.health(),
          apiClient.getSettings(),
          apiClient.getExportHistory(),
        ]);

        if (!active) {
          return;
        }

        setHealth(healthResponse);
        setSettings(settingsResponse);
        setHistory(historyResponse.history);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Dashboard</h1>
        {error ? <p className="mt-2 text-sm text-[var(--clockwork-error)]">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-[var(--clockwork-gray-600)]">API Status</p>
            <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
              {health?.ok ? "Online" : "Starting"}
            </p>
            <p className="mt-1 text-xs text-[var(--clockwork-gray-500)]">
              Uptime: {health ? `${health.uptime.toFixed(0)}s` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-[var(--clockwork-gray-600)]">DB Connection</p>
            <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
              {settings?.connection ? "Configured" : "Missing"}
            </p>
            <p className="mt-1 text-xs text-[var(--clockwork-gray-500)]">
              {settings?.connection
                ? settings.connection.engine === "sqlite"
                  ? settings.connection.sqlitePath
                  : `${settings.connection.engine} @ ${settings.connection.host}`
                : "Open Connections to configure database access"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-[var(--clockwork-gray-600)]">Total Exports</p>
            <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">{history.length}</p>
            <p className="mt-1 text-xs text-[var(--clockwork-gray-500)]">Persisted in local store</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-1 text-sm text-[var(--clockwork-gray-600)]">Default Format</p>
            <p className="text-2xl font-semibold uppercase text-[var(--clockwork-gray-900)]">
              {settings?.settings.defaultExportFormat ?? "pdf"}
            </p>
            <p className="mt-1 text-xs text-[var(--clockwork-gray-500)]">Configured from Settings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Link to="/reports" className="rounded-lg border border-[var(--clockwork-border)] p-4 hover:border-[var(--clockwork-orange)]">
              <FileText className="mb-3 h-6 w-6 text-[var(--clockwork-orange)]" />
              <p className="font-semibold text-[var(--clockwork-gray-900)]">Generate Report</p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">Run filtered attendance reports</p>
            </Link>
            <Link to="/users" className="rounded-lg border border-[var(--clockwork-border)] p-4 hover:border-[var(--clockwork-green)]">
              <User className="mb-3 h-6 w-6 text-[var(--clockwork-green)]" />
              <p className="font-semibold text-[var(--clockwork-gray-900)]">Users</p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">Manage users and saved groups</p>
            </Link>
            <Link to="/connections" className="rounded-lg border border-[var(--clockwork-border)] p-4 hover:border-[var(--clockwork-orange)]">
              <Cable className="mb-3 h-6 w-6 text-[var(--clockwork-orange)]" />
              <p className="font-semibold text-[var(--clockwork-gray-900)]">Configure Connection</p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">Test and persist database settings</p>
            </Link>
            <Link to="/presence" className="rounded-lg border border-[var(--clockwork-border)] p-4 hover:border-[var(--clockwork-green)]">
              <Users className="mb-3 h-6 w-6 text-[var(--clockwork-green)]" />
              <p className="font-semibold text-[var(--clockwork-gray-900)]">Live Presence</p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">Monitor who is currently inside</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Exports</CardTitle>
            <Link to="/exports">
              <Button size="sm" variant="secondary">
                <Download className="h-4 w-4" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-[var(--clockwork-gray-500)]">No exports have been generated yet.</p>
          ) : (
            <div className="space-y-3">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--clockwork-border)] p-3"
                >
                  <div>
                    <p className="font-medium text-[var(--clockwork-gray-900)]">{item.title}</p>
                    <p className="text-xs text-[var(--clockwork-gray-600)]">
                      {formatDateTime(item.createdAt, settings?.settings.defaultCalendar ?? "shamsi")}
                    </p>
                  </div>
                  <p className="text-sm uppercase text-[var(--clockwork-orange)]">{item.format}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[var(--clockwork-green-light)] border-[var(--clockwork-green)]/20">
        <CardContent>
          <div className="flex items-center gap-3">
            <HeartPulse className="h-5 w-5 text-[var(--clockwork-green)]" />
            <p className="text-sm text-[var(--clockwork-gray-700)]">
              Local API is bound to 127.0.0.1 and renderer access is restricted through preload.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
