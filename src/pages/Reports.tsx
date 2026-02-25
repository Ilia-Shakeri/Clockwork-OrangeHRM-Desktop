import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  FileSpreadsheet,
  FileText,
  Files,
  LoaderCircle,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { DataTable } from "@/app/components/DataTable";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { PageHelpButton } from "@/components/PageHelpButton";
import {
  buildDateRange,
  buildReportFilename,
  defaultRangeForPreset,
  formatDateOnly,
  formatDateCompact,
  formatHours,
  formatShamsiDateOnly,
  inferExportFormatFromPath,
  resolveUserDisplayName,
} from "@/lib/helpers";
import {
  filterExistingMemberIds,
  loadUserGroups,
  normalizeMemberIds,
  resolveGroupMembers,
} from "@/lib/user-groups";
import { fetchAllUsers, getUserId } from "@/lib/users";
import type {
  AppUser,
  DateDisplayCalendar,
  DateRangePreset,
  ExportFormat,
  PythonSummaryResponse,
  ReportPayload,
  ReportRow,
  UserGroup,
} from "@/types/api";

const USER_PAGE_SIZE = 30;

type SelectionMode = "users" | "group";

interface UserReportSection {
  userId: string;
  displayName: string;
  rows: ReportRow[];
  payload: ReportPayload;
}

function totalsForRows(rows: ReportRow[], fallbackUsers = 0): ReportPayload["totals"] {
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const uniqueUsers = new Set(rows.map((row) => row.userId));

  return {
    hours: Math.round(totalHours * 100) / 100,
    records: rows.length,
    users: uniqueUsers.size > 0 ? uniqueUsers.size : fallbackUsers,
  };
}

export function Reports() {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("users");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userPage, setUserPage] = useState(1);

  const [datePreset, setDatePreset] = useState<DateRangePreset>("current");
  const [customDateRange, setCustomDateRange] = useState(() => defaultRangeForPreset("current"));
  const [defaultCalendar, setDefaultCalendar] = useState<DateDisplayCalendar>("shamsi");

  const [report, setReport] = useState<ReportPayload | null>(null);
  const [lastRunUserIds, setLastRunUserIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgressLabel, setExportProgressLabel] = useState("");

  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [pythonAvailable, setPythonAvailable] = useState(false);
  const [pythonMessage, setPythonMessage] = useState("Checking Python support...");
  const [summary, setSummary] = useState<PythonSummaryResponse | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [groupsError, setGroupsError] = useState("");

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
        setDefaultCalendar(settingsResponse.settings.defaultCalendar);
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

  const loadUsersAndGroups = async () => {
    setLoadingUsers(true);
    setLoadingGroups(true);

    try {
      const [fetchedUsers, fetchedGroups] = await Promise.all([fetchAllUsers(), loadUserGroups()]);
      setUsers(fetchedUsers);
      setGroups(fetchedGroups);
      setUsersError("");
      setGroupsError("");

      setSelectedGroupId((current) => {
        if (current && fetchedGroups.some((group) => group.id === current)) {
          return current;
        }

        return fetchedGroups[0]?.id ?? "";
      });

      const validIds = new Set(fetchedUsers.map((user) => getUserId(user)));
      setSelectedUserIds((current) => current.filter((memberId) => validIds.has(memberId)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load users/groups";
      setUsersError(message);
      setGroupsError(message);
      toast.error(message);
    } finally {
      setLoadingUsers(false);
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    void loadUsersAndGroups();
  }, []);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  useEffect(() => {
    if (selectionMode !== "group") {
      return;
    }

    if (!activeGroup) {
      setSelectedUserIds([]);
      return;
    }

    setSelectedUserIds(normalizeMemberIds(activeGroup.memberIds));
  }, [activeGroup, selectionMode]);

  const userPages = Math.max(1, Math.ceil(users.length / USER_PAGE_SIZE));
  useEffect(() => {
    setUserPage((current) => Math.min(current, userPages));
  }, [userPages]);

  const visibleUsers = useMemo(() => {
    const start = (userPage - 1) * USER_PAGE_SIZE;
    return users.slice(start, start + USER_PAGE_SIZE);
  }, [userPage, users]);

  const selectedIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const visibleIds = useMemo(() => visibleUsers.map((user) => getUserId(user)), [visibleUsers]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((memberId) => selectedIdSet.has(memberId));

  const selectedUsers = useMemo(() => {
    const byId = new Map<string, AppUser>();
    for (const user of users) {
      byId.set(getUserId(user), user);
    }

    return selectedUserIds
      .map((memberId) => byId.get(memberId))
      .filter(Boolean) as AppUser[];
  }, [selectedUserIds, users]);

  const usersById = useMemo(() => {
    const byId = new Map<string, AppUser>();
    for (const user of users) {
      byId.set(getUserId(user), user);
    }
    return byId;
  }, [users]);

  const selectedGroupMembers = useMemo(
    () => resolveGroupMembers(activeGroup, users),
    [activeGroup, users],
  );

  const unresolvedGroupMembers = useMemo(() => {
    if (!activeGroup) {
      return [];
    }

    const validSet = new Set(selectedGroupMembers.map((user) => getUserId(user)));
    return activeGroup.memberIds.filter((memberId) => !validSet.has(memberId));
  }, [activeGroup, selectedGroupMembers]);

  const effectiveRange = useMemo(() => {
    if (datePreset === "custom") {
      return customDateRange;
    }

    return defaultRangeForPreset(datePreset);
  }, [customDateRange, datePreset]);

  const reportSections = useMemo<UserReportSection[]>(() => {
    if (!report) {
      return [];
    }

    const rowsByUser = new Map<string, ReportRow[]>();
    for (const row of report.rows) {
      const existingRows = rowsByUser.get(row.userId);
      if (existingRows) {
        existingRows.push(row);
      } else {
        rowsByUser.set(row.userId, [row]);
      }
    }

    const sourceUserIds =
      lastRunUserIds.length > 0
        ? lastRunUserIds
        : Array.from(new Set(report.rows.map((row) => row.userId)));

    return sourceUserIds.map((userId) => {
      const userRows = rowsByUser.get(userId) ?? [];
      const mappedUser = usersById.get(userId);
      const sampleRow = userRows[0];
      const displayName = mappedUser
        ? resolveUserDisplayName(mappedUser)
        : sampleRow
          ? resolveUserDisplayName(sampleRow)
          : userId;

      const payload: ReportPayload = {
        rows: userRows,
        totals: totalsForRows(userRows, 1),
      };

      return {
        userId,
        displayName,
        rows: userRows,
        payload,
      };
    });
  }, [lastRunUserIds, report, usersById]);

  const toggleUserSelection = (memberId: string) => {
    setSelectedUserIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }

      return [...current, memberId];
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedUserIds((current) => {
      const currentSet = new Set(current);
      if (allVisibleSelected) {
        return current.filter((memberId) => !visibleIds.includes(memberId));
      }

      for (const memberId of visibleIds) {
        currentSet.add(memberId);
      }
      return Array.from(currentSet);
    });
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleRunReport = async () => {
    const finalIds =
      selectionMode === "group" && activeGroup
        ? normalizeMemberIds(activeGroup.memberIds)
        : normalizeMemberIds(selectedUserIds);

    if (finalIds.length === 0) {
      toast.error(
        selectionMode === "group"
          ? "Select a group with at least one user."
          : "Select at least one user.",
      );
      return;
    }

    if (selectionMode === "group") {
      const validIds = filterExistingMemberIds(finalIds, users);
      if (validIds.length === 0) {
        toast.error("Selected group has no users available in the current database result.");
        return;
      }
      setSelectedUserIds(validIds);
    }

    const resolvedUserIds =
      selectionMode === "group"
        ? filterExistingMemberIds(finalIds, users)
        : finalIds;

    setRunning(true);
    setSummary(null);

    try {
      const result = await apiClient.runReport({
        userIds: resolvedUserIds,
        dateRange: buildDateRange(datePreset, customDateRange),
      });
      setReport(result);
      setLastRunUserIds(resolvedUserIds);
      toast.success(`Report generated (${result.rows.length} rows).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  const reportTitle =
    datePreset === "payroll-cycle"
      ? "Clockwork Payroll Orbit Report (Madar-e Hoghooghi 26-25)"
      : "Clockwork Attendance Report";

  const buildUserDisplayMap = (): Record<string, string> => {
    const pairs = reportSections.map((section) => [section.userId, section.displayName] as const);
    return Object.fromEntries(pairs);
  };

  const exportPayloadToSelectedPath = async (
    payload: ReportPayload,
    format: ExportFormat,
    defaultPath: string,
    meta: {
      userDisplayName?: string;
      userDisplayMap?: Record<string, string>;
    } = {},
  ) => {
    const saveDialog = await window.clockwork.openSaveDialog({
      title: "Save report export",
      defaultPath,
      filters: [
        {
          name: format.toUpperCase(),
          extensions: [format],
        },
      ],
    });

    if (saveDialog.canceled || !saveDialog.filePath) {
      return null;
    }

    const normalizedPath = saveDialog.filePath.toLowerCase().endsWith(`.${format}`)
      ? saveDialog.filePath
      : `${saveDialog.filePath}.${format}`;

    await apiClient.exportReport({
      format,
      reportPayload: payload,
      meta: {
        title: reportTitle,
        from: effectiveRange.from,
        to: effectiveRange.to,
        ...meta,
      },
      savePath: normalizedPath,
    });

    window.dispatchEvent(
      new CustomEvent("clockwork:export-created", {
        detail: {
          filePath: normalizedPath,
          format,
        },
      }),
    );

    return normalizedPath;
  };

  const exportSection = async (
    section: UserReportSection,
    format: ExportFormat,
  ) => {
    setExporting(true);
    setExportProgressLabel("");

    try {
      const defaultPath = buildReportFilename({
        format,
        from: effectiveRange.from,
        to: effectiveRange.to,
        displayName: section.displayName,
      });

      const exportedPath = await exportPayloadToSelectedPath(
        section.payload,
        format,
        defaultPath,
        { userDisplayName: section.displayName },
      );

      if (exportedPath) {
        toast.success(`Exported ${format.toUpperCase()} for ${section.displayName}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
      setExportProgressLabel("");
    }
  };

  const handleExportMergedAll = async () => {
    if (!report) {
      return;
    }

    setExporting(true);
    setExportProgressLabel("Preparing merged export...");

    try {
      const defaultPath = buildReportFilename({
        format: exportFormat,
        from: effectiveRange.from,
        to: effectiveRange.to,
        merged: reportSections.length > 1,
        userCount: reportSections.length,
      });

      const saveDialog = await window.clockwork.openSaveDialog({
        title: "Save merged report export",
        defaultPath,
        filters: [
          { name: "PDF", extensions: ["pdf"] },
          { name: "CSV", extensions: ["csv"] },
        ],
      });

      if (saveDialog.canceled || !saveDialog.filePath) {
        return;
      }

      const selectedFormat = inferExportFormatFromPath(saveDialog.filePath, exportFormat);
      const normalizedPath = saveDialog.filePath.toLowerCase().endsWith(`.${selectedFormat}`)
        ? saveDialog.filePath
        : `${saveDialog.filePath}.${selectedFormat}`;

      await exportMergedToPath(selectedFormat, normalizedPath);
      toast.success(`Exported merged ${selectedFormat.toUpperCase()} to ${normalizedPath}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merged export failed");
    } finally {
      setExporting(false);
      setExportProgressLabel("");
    }
  };

  const exportMergedToPath = async (
    format: ExportFormat,
    savePath: string,
  ) => {
    if (!report) {
      return;
    }

    await apiClient.exportReport({
      format,
      reportPayload: report,
      meta: {
        title: reportTitle,
        from: effectiveRange.from,
        to: effectiveRange.to,
        userDisplayMap: buildUserDisplayMap(),
      },
      savePath,
    });

    window.dispatchEvent(
      new CustomEvent("clockwork:export-created", {
        detail: {
          filePath: savePath,
          format,
        },
      }),
    );
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Reports</h1>
        </div>
        <PageHelpButton
          title="Reports Help"
          overview="Build attendance reports for selected users or a saved group and export them as PDF or CSV."
          steps={[
            "Choose selection mode: manual users or a saved group.",
            "Pick a date range preset or set a custom range.",
            "Run report, then export in your preferred format.",
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadUsersAndGroups()}
              disabled={loadingUsers || loadingGroups}
            >
              {loadingUsers || loadingGroups ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Users/Groups
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Selection Mode
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectionMode === "users" ? "primary" : "secondary"}
                  onClick={() => setSelectionMode("users")}
                >
                  Select Users
                </Button>
                <Button
                  size="sm"
                  variant={selectionMode === "group" ? "primary" : "secondary"}
                  onClick={() => setSelectionMode("group")}
                >
                  Select Group
                </Button>
              </div>
            </div>

            {usersError ? (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--clockwork-error)]/40 bg-red-50 p-3 text-sm text-[var(--clockwork-error)] dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p>{usersError}</p>
              </div>
            ) : null}

            {groupsError ? (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--clockwork-error)]/40 bg-red-50 p-3 text-sm text-[var(--clockwork-error)] dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p>{groupsError}</p>
              </div>
            ) : null}

            {selectionMode === "users" ? (
              <div className="space-y-3 rounded-lg border border-[var(--clockwork-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--clockwork-gray-600)]">
                    {users.length} users loaded | Selected:{" "}
                    <span className="font-semibold text-[var(--clockwork-gray-900)]">
                      {selectedUserIds.length}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSelectAllVisible}
                      disabled={visibleIds.length === 0}
                    >
                      {allVisibleSelected ? "Unselect Visible" : "Select All"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearSelection}
                      disabled={selectedUserIds.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`reports-users-skeleton-${index}`}
                        className="h-8 animate-pulse rounded bg-[var(--clockwork-gray-100)]"
                      />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-sm text-[var(--clockwork-gray-500)]">
                    No users available. Check your DB connection and refresh.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-[var(--clockwork-border)]">
                      <table className="w-full border-collapse">
                        <thead className="bg-[var(--clockwork-orange)] text-white">
                          <tr>
                            <th className="w-12 px-3 py-2 text-left text-xs font-semibold">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Full Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Username</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Employee ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleUsers.map((user) => {
                            const memberId = getUserId(user);
                            return (
                              <tr
                                key={memberId}
                                className="border-t border-[var(--clockwork-border)] hover:bg-[var(--clockwork-gray-50)]"
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedIdSet.has(memberId)}
                                    onChange={() => toggleUserSelection(memberId)}
                                    className="h-4 w-4 accent-[var(--clockwork-orange)]"
                                  />
                                </td>
                                <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-900)]">
                                  {user.fullName}
                                </td>
                                <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-700)]">
                                  {user.username}
                                </td>
                                <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-700)]">
                                  {user.employeeId ?? "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[var(--clockwork-gray-500)]">
                        Page {userPage} of {userPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setUserPage((current) => Math.max(1, current - 1))}
                          disabled={userPage <= 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setUserPage((current) => Math.min(userPages, current + 1))}
                          disabled={userPage >= userPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-[var(--clockwork-border)] p-3">
                <label
                  htmlFor="report-group-selector"
                  className="block text-sm font-medium text-[var(--clockwork-gray-700)]"
                >
                  Saved Group
                </label>
                <select
                  id="report-group-selector"
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-lg border border-[var(--clockwork-border)] bg-[var(--clockwork-bg-primary)] px-3 py-2 text-sm text-[var(--clockwork-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]"
                >
                  {groups.length === 0 ? <option value="">No groups found</option> : null}
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.memberIds.length})
                    </option>
                  ))}
                </select>

                <div className="rounded border border-[var(--clockwork-border)] p-3">
                  <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-900)]">
                    Auto-selected users
                  </p>
                  {loadingUsers || loadingGroups ? (
                    <p className="text-sm text-[var(--clockwork-gray-500)]">Loading group members...</p>
                  ) : !activeGroup ? (
                    <p className="text-sm text-[var(--clockwork-gray-500)]">Select a group.</p>
                  ) : activeGroup.memberIds.length === 0 ? (
                    <p className="text-sm text-[var(--clockwork-gray-500)]">This group has no members.</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedGroupMembers.map((user) => (
                        <p
                          key={getUserId(user)}
                          className="truncate text-sm text-[var(--clockwork-gray-700)]"
                        >
                          {user.fullName} ({user.username})
                        </p>
                      ))}
                      {unresolvedGroupMembers.length > 0 ? (
                        <p className="text-xs text-[var(--clockwork-warning)]">
                          {unresolvedGroupMembers.length} member(s) were not found in current DB user list.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-700)]">
                Date Range
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={datePreset === "payroll-cycle" ? "primary" : "secondary"}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <p className="text-xs text-[var(--clockwork-gray-600)]">
              Active Range: {formatDateCompact(effectiveRange.from, defaultCalendar)}{" "}
              <span className="font-semibold text-[var(--clockwork-orange)]">to</span>{" "}
              {formatDateCompact(effectiveRange.to, defaultCalendar)}
            </p>

            <div className="rounded-lg border border-[var(--clockwork-border)] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-[var(--clockwork-gray-700)]">
                <Users className="h-4 w-4 text-[var(--clockwork-green)]" />
                Selected users for report: {selectedUserIds.length}
              </div>
              {selectedUsers.length === 0 ? (
                <p className="text-sm text-[var(--clockwork-gray-500)]">
                  No selected users yet.
                </p>
              ) : (
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {selectedUsers.map((user) => (
                    <p key={getUserId(user)} className="text-sm text-[var(--clockwork-gray-700)]">
                      {user.fullName} ({user.username})
                    </p>
                  ))}
                  {selectedUserIds.length > selectedUsers.length ? (
                    <p className="text-xs text-[var(--clockwork-warning)]">
                      {selectedUserIds.length - selectedUsers.length} selection(s) are not currently available.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

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
                  <Button
                    variant="secondary"
                    onClick={handleExportMergedAll}
                    disabled={exporting || reportSections.length === 0}
                  >
                    {exporting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        {exportProgressLabel || "Exporting..."}
                      </>
                    ) : (
                      <>
                        <Files className="h-4 w-4" />
                        Export All (Merged)
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
          <div className="space-y-4">
            {reportSections.map((section) => (
              <Card key={`report-section-${section.userId}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle>{`Report: ${section.displayName}`}</CardTitle>
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--clockwork-gray-600)]">
                        <span>
                          Total Hours:{" "}
                          <strong className="text-[var(--clockwork-gray-900)]">
                            {formatHours(section.payload.totals.hours)}
                          </strong>
                        </span>
                        <span>
                          Records:{" "}
                          <strong className="text-[var(--clockwork-gray-900)]">
                            {section.payload.totals.records}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => void exportSection(section, "pdf")}
                        disabled={exporting}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-[var(--clockwork-green)] hover:bg-[var(--clockwork-green-hover)] focus:ring-[var(--clockwork-green)]"
                        onClick={() => void exportSection(section, "csv")}
                        disabled={exporting}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable<ReportRow>
                    data={section.rows}
                    emptyMessage="No attendance records for this user in the selected range."
                    getRowKey={(row) => `${row.userId}-${row.date}-${row.checkIn}`}
                    columns={[
                      {
                        key: "date-shamsi",
                        header: "Shamsi",
                        render: (row) => formatShamsiDateOnly(row.date),
                      },
                      {
                        key: "date-gregorian",
                        header: "Gregorian",
                        render: (row) => formatDateOnly(row.date),
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
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Python Enhancement</CardTitle>
                {pythonAvailable ? (
                  <Button
                    variant="secondary"
                    onClick={handlePythonSummary}
                    disabled={summarizing}
                  >
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
                            {item.username} on {formatShamsiDateOnly(item.date)}:{" "}
                            {item.hours.toFixed(2)} hrs
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
