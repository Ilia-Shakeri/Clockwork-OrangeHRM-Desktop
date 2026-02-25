import { useEffect, useMemo, useState } from "react";
import { Bot, Save } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/Card";
import { Input } from "@/app/components/Input";
import type { PythonStatusResponse, UiSettings } from "@/types/api";

const DEFAULT_SETTINGS: UiSettings = {
  theme: "light",
  defaultExportFormat: "pdf",
  defaultDatePreset: "current",
  defaultCalendar: "shamsi",
  defaultPresenceRefreshSeconds: 30,
  usernameValidationRegex: "^[A-Za-z]{2}\\.[A-Za-z][A-Za-z0-9_-]*$",
};

const PRESENCE_REFRESH_OPTIONS = [
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 120, label: "2 minutes" },
  { value: 300, label: "5 minutes" },
];

export function Settings() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS);
  const [pythonStatus, setPythonStatus] = useState<PythonStatusResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [settingsResponse, pythonResponse] = await Promise.all([
          apiClient.getSettings(),
          apiClient.getPythonStatus(),
        ]);

        if (!active) {
          return;
        }

        setSettings(settingsResponse.settings);
        setPythonStatus(pythonResponse);
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load settings",
          );
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const regexStatus = useMemo(() => {
    try {
      // eslint-disable-next-line no-new
      new RegExp(settings.usernameValidationRegex);
      return "valid";
    } catch {
      return "invalid";
    }
  }, [settings.usernameValidationRegex]);

  const handleSave = async () => {
    if (regexStatus === "invalid") {
      toast.error("Username regex is invalid.");
      return;
    }

    setSaving(true);

    try {
      await apiClient.saveSettings(settings);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">
          Settings
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Default Export Format
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={
                    settings.defaultExportFormat === "pdf"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultExportFormat: "pdf",
                    }))
                  }
                >
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.defaultExportFormat === "csv"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultExportFormat: "csv",
                    }))
                  }
                >
                  CSV
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Default Calendar
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={
                    settings.defaultCalendar === "gregorian"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultCalendar: "gregorian",
                    }))
                  }
                >
                  Gregorian
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.defaultCalendar === "shamsi"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultCalendar: "shamsi",
                    }))
                  }
                >
                  Solar
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Default Date Range
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={
                    settings.defaultDatePreset === "payroll-cycle"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultDatePreset: "payroll-cycle",
                    }))
                  }
                >
                  26-25
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.defaultDatePreset === "current"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultDatePreset: "current",
                    }))
                  }
                >
                  Current
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.defaultDatePreset === "last"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultDatePreset: "last",
                    }))
                  }
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.defaultDatePreset === "custom"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      defaultDatePreset: "custom",
                    }))
                  }
                >
                  Custom
                </Button>
              </div>
            </div>

            <div>
              <label
                htmlFor="presence-refresh-interval"
                className="mb-2 block text-sm font-medium text-[var(--clockwork-gray-700)]"
              >
                Live Presence Auto Refresh
              </label>
              <select
                id="presence-refresh-interval"
                value={settings.defaultPresenceRefreshSeconds}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultPresenceRefreshSeconds: Number(event.target.value),
                  }))
                }
                className="w-full max-w-xs rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-3 py-2 text-sm text-[var(--clockwork-gray-900)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]"
              >
                {PRESENCE_REFRESH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Username Regex"
            value={settings.usernameValidationRegex}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                usernameValidationRegex: event.target.value,
              }))
            }
            helperText="Default format is two letters + dot + family name (example: am.rezaei). You can change it."
            error={
              regexStatus === "invalid" ? "Invalid regex pattern" : undefined
            }
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
