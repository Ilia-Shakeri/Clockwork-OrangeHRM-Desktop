import { useEffect, useMemo, useState } from "react";
import { Bot, Moon, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { Input } from "@/app/components/Input";
import type { PythonStatusResponse, UiSettings } from "@/types/api";

const DEFAULT_SETTINGS: UiSettings = {
  theme: "light",
  defaultExportFormat: "pdf",
  defaultDatePreset: "current",
  usernameValidationRegex: "^[a-zA-Z0-9._-]+$",
  bulkScanMode: "combined",
};

export function Settings() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS);
  const [pythonStatus, setPythonStatus] = useState<PythonStatusResponse | null>(null);
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
          toast.error(error instanceof Error ? error.message : "Failed to load settings");
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

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
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Settings</h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Configure app behavior, defaults, and validation rules stored in electron-store.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-[var(--clockwork-border)] p-4">
            <div>
              <p className="font-medium text-[var(--clockwork-gray-900)]">
                {settings.theme === "dark" ? "Dark Theme" : "Light Theme"}
              </p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                OrangeHRM palette is preserved in both themes.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  theme: current.theme === "light" ? "dark" : "light",
                }))
              }
            >
              {settings.theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Toggle Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">Default Export Format</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={settings.defaultExportFormat === "pdf" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, defaultExportFormat: "pdf" }))}
                >
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant={settings.defaultExportFormat === "csv" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, defaultExportFormat: "csv" }))}
                >
                  CSV
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">Default Date Range</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={settings.defaultDatePreset === "current" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, defaultDatePreset: "current" }))}
                >
                  Current
                </Button>
                <Button
                  size="sm"
                  variant={settings.defaultDatePreset === "last" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, defaultDatePreset: "last" }))}
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant={settings.defaultDatePreset === "custom" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, defaultDatePreset: "custom" }))}
                >
                  Custom
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">Bulk Scan Mode</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={settings.bulkScanMode === "combined" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, bulkScanMode: "combined" }))}
                >
                  Combined
                </Button>
                <Button
                  size="sm"
                  variant={settings.bulkScanMode === "per-user" ? "primary" : "secondary"}
                  onClick={() => setSettings((current) => ({ ...current, bulkScanMode: "per-user" }))}
                >
                  Per User
                </Button>
              </div>
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
            helperText="Used by Bulk Scan for client-side and backend validation"
            error={regexStatus === "invalid" ? "Invalid regex pattern" : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Python Enhancements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 text-[var(--clockwork-orange)]" />
            <p className="text-sm text-[var(--clockwork-gray-700)]">
              {pythonStatus
                ? pythonStatus.available
                  ? `Enabled: ${pythonStatus.message}`
                  : `Python enhancements unavailable: ${pythonStatus.message}`
                : "Checking Python runtime..."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Sun className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
