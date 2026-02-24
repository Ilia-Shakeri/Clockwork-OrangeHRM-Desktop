import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bot, Download, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { DataTable } from "@/app/components/DataTable";
import { Input } from "@/app/components/Input";
import { MultiSelect } from "@/app/components/MultiSelect";
import {
  buildDateRange,
  defaultRangeForPreset,
  formatDate,
  formatHours,
  suggestedExportFilename,
} from "@/lib/helpers";
import type {
  DateRangePreset,
  ExportFormat,
  PythonSummaryResponse,
  ReportPayload,
  ReportRow,
} from "@/types/api";

export function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [datePreset, setDatePreset] = useState<DateRangePreset>("current");
  const [customDateRange, setCustomDateRange] = useState(() => defaultRangeForPreset("current"));

  const [report, setReport] = useState<ReportPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [pythonAvailable, setPythonAvailable] = useState(false);
  const [pythonMessage, setPythonMessage] = useState("Checking Python support...");
  const [summary, setSummary] = useState<PythonSummaryResponse | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      try {
        const [settingsResponse, pythonStatus] = await Promise.all([
          apiClient.getSettings(),
          apiClient.getPythonStatus(),
        ]);

        if (!active) {
          return;
        }

        setExportFormat(settingsResponse.settings.defaultExportFormat);
        setDatePreset(settingsResponse.settings.defaultDatePreset);
        setCustomDateRange(defaultRangeForPreset(settingsResponse.settings.defaultDatePreset));

        setPythonAvailable(pythonStatus.available);
        setPythonMessage(pythonStatus.message);
      } catch (error) {
        if (!active) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Failed to load report settings");
      }
    };

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      apiClient
        .searchUsers(searchQuery)
        .then(({ users }) => {
          if (!active) {
            return;
          }

          setUserOptions(
            users.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.username})`,
            })),
          );
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          toast.error(error instanceof Error ? error.message : "Failed to search users");
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const effectiveRange = useMemo(() => {
    if (datePreset === "custom") {
      return customDateRange;
    }

    return defaultRangeForPreset(datePreset);
  }, [customDateRange, datePreset]);

  const handleRunReport = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Select at least one user.");
      return;
    }

    setRunning(true);
    setSummary(null);

    try {
      const result = await apiClient.runReport({
        userIds: selectedUserIds,
        dateRange: buildDateRange(datePreset, customDateRange),
      });
      setReport(result);
      toast.success(`Report generated (${result.rows.length} rows).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  const handleExport = async () => {
    if (!report) {
      return;
    }

    setExporting(true);

    try {
      const defaultPath = suggestedExportFilename(
        exportFormat,
        effectiveRange.from,
        effectiveRange.to,
      );

      const saveDialog = await window.clockwork.openSaveDialog({
        title: "Save report export",
        defaultPath,
        filters: [
          {
            name: exportFormat.toUpperCase(),
            extensions: [exportFormat],
          },
        ],
      });

      if (saveDialog.canceled || !saveDialog.filePath) {
        return;
      }

      await apiClient.exportReport({
        format: exportFormat,
        reportPayload: report,
        meta: {
          title: "Clockwork Attendance Report",
          from: effectiveRange.from,
          to: effectiveRange.to,
        },
        savePath: saveDialog.filePath,
      });

      toast.success(`Exported ${exportFormat.toUpperCase()} to ${saveDialog.filePath}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handlePythonSummary = async () => {
    if (!report || !pythonAvailable) {
      return;
    }

    setSummarizing(true);

    try {
      const pythonSummary = await apiClient.generatePythonSummary(report);
      setSummary(pythonSummary);
      toast.success("Python summary generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Python summary failed");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Reports</h1>
        <p className="text-[var(--clockwork-gray-600)]">
          Build deterministic attendance reports, export as PDF/CSV, and optionally run Python summaries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Search Users"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type username or full name"
              helperText="Shows up to 20 matches from OrangeHRM users"
            />

            <MultiSelect
              label="Selected Users"
              options={userOptions}
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              placeholder="Pick one or more users"
            />

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">Date Range</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={datePreset === "current" ? "primary" : "secondary"}
                  onClick={() => setDatePreset("current")}
                >
                  Current
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="From"
                  type="date"
                  value={customDateRange.from}
                  onChange={(event) =>
                    setCustomDateRange((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                />
                <Input
                  label="To"
                  type="date"
                  value={customDateRange.to}
                  onChange={(event) =>
                    setCustomDateRange((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" onClick={handleRunReport} disabled={running}>
                {running ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Run Report
                  </>
                )}
              </Button>

              {report ? (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={exportFormat === "pdf" ? "primary" : "secondary"}
                      onClick={() => setExportFormat("pdf")}
                    >
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant={exportFormat === "csv" ? "primary" : "secondary"}
                      onClick={() => setExportFormat("csv")}
                    >
                      CSV
                    </Button>
                  </div>

                  <Button variant="secondary" onClick={handleExport} disabled={exporting}>
                    {exporting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Export
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent>
                <p className="text-sm text-[var(--clockwork-gray-600)]">Total Hours</p>
                <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
                  {formatHours(report.totals.hours)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-[var(--clockwork-gray-600)]">Records</p>
                <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">
                  {report.totals.records}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-[var(--clockwork-gray-600)]">Users</p>
                <p className="text-2xl font-semibold text-[var(--clockwork-gray-900)]">{report.totals.users}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Results</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable<ReportRow>
                data={report.rows}
                getRowKey={(row) => `${row.userId}-${row.date}-${row.checkIn}`}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    render: (row) => formatDate(row.date),
                  },
                  {
                    key: "username",
                    header: "Username",
                    render: (row) => row.username,
                  },
                  {
                    key: "fullName",
                    header: "Full Name",
                    render: (row) => row.fullName,
                  },
                  {
                    key: "checkIn",
                    header: "Check In",
                    render: (row) => row.checkIn || "-",
                  },
                  {
                    key: "checkOut",
                    header: "Check Out",
                    render: (row) => row.checkOut || "Missing",
                  },
                  {
                    key: "hours",
                    header: "Hours",
                    align: "right",
                    render: (row) => row.hours.toFixed(2),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Python Enhancement</CardTitle>
                {pythonAvailable ? (
                  <Button variant="secondary" onClick={handlePythonSummary} disabled={summarizing}>
                    {summarizing ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!pythonAvailable ? (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--clockwork-border)] p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--clockwork-warning)]" />
                  <p className="text-sm text-[var(--clockwork-gray-700)]">
                    Python enhancements unavailable: {pythonMessage}
                  </p>
                </div>
              ) : summary ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--clockwork-gray-700)]">{summary.summary}</p>
                  {summary.anomalies.length > 0 ? (
                    <div className="rounded-lg border border-[var(--clockwork-orange)]/30 bg-[var(--clockwork-orange-light)] p-3">
                      <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-900)]">
                        High-hour anomalies ({summary.anomalies.length})
                      </p>
                      <ul className="space-y-1 text-sm text-[var(--clockwork-gray-700)]">
                        {summary.anomalies.map((item) => (
                          <li key={`${item.username}-${item.date}`}>
                            {item.username} on {item.date}: {item.hours.toFixed(2)} hrs
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[var(--clockwork-gray-600)]">
                  Python integration detected. Generate a summary for additional insights.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
