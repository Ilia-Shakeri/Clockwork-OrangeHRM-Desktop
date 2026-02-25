import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Badge } from "@/app/components/Badge";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { ProgressBar } from "@/app/components/Progress";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import {
  buildDateRange,
  defaultRangeForPreset,
  formatDateCompact,
  parseUsernamesFromText,
} from "@/lib/helpers";
import type {
  BulkScanMode,
  DateDisplayCalendar,
  DateRangePreset,
  ReportPayload,
  ResolvedUserResult,
  UiSettings,
} from "@/types/api";

function defaultSettings(): UiSettings {
  return {
    theme: "light",
    defaultExportFormat: "pdf",
    defaultDatePreset: "current",
    defaultCalendar: "shamsi",
    usernameValidationRegex: "^[a-zA-Z0-9._-]+$",
    bulkScanMode: "combined",
  };
}

export function BulkScan() {
  const [settings, setSettings] = useState<UiSettings>(defaultSettings());
  const [loaded, setLoaded] = useState(false);

  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");

  const [datePreset, setDatePreset] = useState<DateRangePreset>("current");
  const [customDateRange, setCustomDateRange] = useState(() => defaultRangeForPreset("current"));
  const [defaultCalendar, setDefaultCalendar] = useState<DateDisplayCalendar>("shamsi");

  const [resolving, setResolving] = useState(false);
  const [resolvedUsers, setResolvedUsers] = useState<ResolvedUserResult[]>([]);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchReport, setBatchReport] = useState<ReportPayload | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiClient.getSettings();
        if (!active) {
          return;
        }

        setSettings(response.settings);
        setDatePreset(response.settings.defaultDatePreset);
        setCustomDateRange(defaultRangeForPreset(response.settings.defaultDatePreset));
        setDefaultCalendar(response.settings.defaultCalendar);
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Failed to load settings");
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const usernames = useMemo(() => parseUsernamesFromText(rawText), [rawText]);

  const usernameRegex = useMemo(() => {
    try {
      return new RegExp(settings.usernameValidationRegex);
    } catch {
      return /^[a-zA-Z0-9._-]+$/;
    }
  }, [settings.usernameValidationRegex]);

  const localInvalid = useMemo(
    () => usernames.filter((username) => !usernameRegex.test(username)),
    [usernames, usernameRegex],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setRawText(content);
      setResolvedUsers([]);
      setBatchReport(null);
    };
    reader.readAsText(file);
  };

  const persistMode = async (mode: BulkScanMode) => {
    const next = { ...settings, bulkScanMode: mode };
    setSettings(next);
    try {
      await apiClient.saveSettings(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to persist bulk mode");
    }
  };

  const handleResolveUsers = async () => {
    if (usernames.length === 0) {
      toast.error("Add usernames first.");
      return;
    }

    setResolving(true);
    setBatchReport(null);

    try {
      const response = await apiClient.resolveUsers(usernames);
      setResolvedUsers(response.users);
      const found = response.users.filter((item) => item.status === "matched").length;
      toast.success(`Resolved ${found}/${response.users.length} usernames.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve usernames");
    } finally {
      setResolving(false);
    }
  };

  const effectiveRange =
    datePreset === "custom" ? customDateRange : defaultRangeForPreset(datePreset);

  const handleRunBatch = async () => {
    const matchedIds = resolvedUsers
      .filter((result) => result.status === "matched" && result.user)
      .map((result) => result.user!.id);

    if (matchedIds.length === 0) {
      toast.error("No valid users resolved for report execution.");
      return;
    }

    setRunning(true);
    setProgress(0);

    try {
      if (settings.bulkScanMode === "combined") {
        const report = await apiClient.runReport({
          userIds: matchedIds,
          dateRange: buildDateRange(datePreset, customDateRange),
        });
        setProgress(100);
        setBatchReport(report);
      } else {
        const allRows: ReportPayload["rows"] = [];

        for (let index = 0; index < matchedIds.length; index += 1) {
          const userId = matchedIds[index];
          const report = await apiClient.runReport({
            userIds: [userId],
            dateRange: buildDateRange(datePreset, customDateRange),
          });

          allRows.push(...report.rows);
          setProgress(Math.round(((index + 1) / matchedIds.length) * 100));
        }

        const totalHours = allRows.reduce((sum, row) => sum + row.hours, 0);
        const users = new Set(allRows.map((row) => row.userId)).size;

        setBatchReport({
          rows: allRows,
          totals: {
            hours: Math.round(totalHours * 100) / 100,
            records: allRows.length,
            users,
          },
        });
      }

      toast.success("Batch report generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch report execution failed");
    } finally {
      setRunning(false);
    }
  };

  const foundCount = resolvedUsers.filter((item) => item.status === "matched").length;
  const notFoundCount = resolvedUsers.filter((item) => item.status === "not-found").length;
  const invalidCount = resolvedUsers.filter((item) => item.status === "invalid").length;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">
          Bulk Scan
        </h1>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label
              htmlFor="bulk-file"
              className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--clockwork-border)] bg-[var(--clockwork-gray-50)]"
            >
              <Upload className="mb-2 h-6 w-6 text-[var(--clockwork-gray-500)]" />
              <p className="text-sm text-[var(--clockwork-gray-700)]">
                Upload users.txt
              </p>
              <p className="text-xs text-[var(--clockwork-gray-500)]">
                One username per line or comma-separated
              </p>
            </label>
            <input
              id="bulk-file"
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileSelect}
            />

            {fileName ? (
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Loaded file: {fileName}
              </p>
            ) : null}

            <textarea
              value={rawText}
              onChange={(event) => {
                setRawText(event.target.value);
                setResolvedUsers([]);
                setBatchReport(null);
              }}
              rows={8}
              className="w-full rounded-lg border border-[var(--clockwork-border)] px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]"
              placeholder="Paste usernames here"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={handleResolveUsers}
                disabled={resolving || usernames.length === 0 || !loaded}
              >
                {resolving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  "Resolve Users"
                )}
              </Button>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                {usernames.length} parsed username(s)
              </p>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                {localInvalid.length} invalid by regex
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Execution Mode
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={
                    settings.bulkScanMode === "combined"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => void persistMode("combined")}
                >
                  Combined Report
                </Button>
                <Button
                  size="sm"
                  variant={
                    settings.bulkScanMode === "per-user"
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => void persistMode("per-user")}
                >
                  Per User
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Date Range
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={
                    datePreset === "payroll-cycle" ? "primary" : "secondary"
                  }
                  onClick={() => setDatePreset("payroll-cycle")}
                >
                  26-25
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "current" ? "primary" : "secondary"}
                  onClick={() => setDatePreset("current")}
                >
                  Current Month
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "last" ? "primary" : "secondary"}
                  onClick={() => setDatePreset("last")}
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "custom" ? "primary" : "secondary"}
                  onClick={() => setDatePreset("custom")}
                >
                  Custom
                </Button>
              </div>
            </div>

            {datePreset === "custom" ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <JalaliDatePicker
                  label="From"
                  value={customDateRange.from}
                  calendar={defaultCalendar}
                  onChange={(nextDate) =>
                    setCustomDateRange((current) => ({
                      ...current,
                      from: nextDate,
                    }))
                  }
                />
                <JalaliDatePicker
                  label="To"
                  value={customDateRange.to}
                  calendar={defaultCalendar}
                  onChange={(nextDate) =>
                    setCustomDateRange((current) => ({
                      ...current,
                      to: nextDate,
                    }))
                  }
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleRunBatch}
                disabled={running || foundCount === 0}
              >
                {running ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  "Run Batch Report"
                )}
              </Button>
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                Range: {formatDateCompact(effectiveRange.from, defaultCalendar)}{" "}
                <span className="font-semibold text-[var(--clockwork-orange)]">to</span>{" "}
                {formatDateCompact(effectiveRange.to, defaultCalendar)}
              </p>
            </div>

            {running ? (
              <ProgressBar value={progress} label="Executing report jobs" />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {resolvedUsers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--clockwork-green)]" />
                <div>
                  <p className="text-xl font-semibold text-[var(--clockwork-gray-900)]">
                    {foundCount}
                  </p>
                  <p className="text-sm text-[var(--clockwork-gray-600)]">
                    Matched
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-[var(--clockwork-warning)]" />
                <div>
                  <p className="text-xl font-semibold text-[var(--clockwork-gray-900)]">
                    {notFoundCount}
                  </p>
                  <p className="text-sm text-[var(--clockwork-gray-600)]">
                    Not Found
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-[var(--clockwork-error)]" />
                <div>
                  <p className="text-xl font-semibold text-[var(--clockwork-gray-900)]">
                    {invalidCount}
                  </p>
                  <p className="text-sm text-[var(--clockwork-gray-600)]">
                    Invalid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {resolvedUsers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resolved Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resolvedUsers.map((item) => (
                <Badge
                  key={`${item.username}-${item.status}`}
                  variant={
                    item.status === "matched"
                      ? "success"
                      : item.status === "not-found"
                        ? "warning"
                        : "error"
                  }
                >
                  {item.username}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {batchReport ? (
        <Card>
          <CardHeader>
            <CardTitle>Batch Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[var(--clockwork-orange)]" />
              <p className="text-sm text-[var(--clockwork-gray-700)]">
                Generated {batchReport.totals.records} records for{" "}
                {batchReport.totals.users} user(s), totaling{" "}
                {batchReport.totals.hours.toFixed(2)} hours.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
