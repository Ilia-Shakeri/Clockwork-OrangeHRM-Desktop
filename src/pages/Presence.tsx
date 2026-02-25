import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Badge } from "@/app/components/Badge";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { DataTable } from "@/app/components/DataTable";
import { Input } from "@/app/components/Input";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { PageHelpButton } from "@/components/PageHelpButton";
import { formatDateCompact, todayIso } from "@/lib/helpers";
import type { DateDisplayCalendar, PresenceRow, PresenceStatus } from "@/types/api";

function statusOrder(status: PresenceStatus): number {
  if (status === "inside") {
    return 0;
  }

  if (status === "out") {
    return 1;
  }

  return 2;
}

function formatSinceCheckIn(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return "-";
  }

  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remMinutes}m`;
  }

  return `${hours}h ${remMinutes}m`;
}

function renderStatusBadge(row: PresenceRow) {
  if (row.status === "inside") {
    return (
      <div className="space-y-1">
        <Badge variant="success">Inside</Badge>
        <p className="text-xs text-[var(--clockwork-gray-500)]">
          Since check-in: {formatSinceCheckIn(row.sinceCheckInMinutes)}
        </p>
      </div>
    );
  }

  if (row.status === "out") {
    return <Badge variant="warning">Out</Badge>;
  }

  return <Badge variant="neutral">Unknown</Badge>;
}

export function Presence() {
  const [selectedDate, setSelectedDate] = useState(() => todayIso());
  const [defaultCalendar, setDefaultCalendar] = useState<DateDisplayCalendar>("shamsi");
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [presenceDate, setPresenceDate] = useState(() => todayIso());
  const [totals, setTotals] = useState({ inside: 0, out: 0, totalSeen: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hasLoadedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;

    apiClient
      .getSettings()
      .then((response) => {
        if (!active) {
          return;
        }

        setDefaultCalendar(response.settings.defaultCalendar);
        setRefreshSeconds(response.settings.defaultPresenceRefreshSeconds);
      })
      .catch(() => {
        // Keep fallback calendar when settings are unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const loadPresence = useCallback(async (dateIso: string, notifyOnError: boolean) => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;

    if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = await apiClient.getPresence(dateIso);

      setRows(payload.rows);
      setPresenceDate(payload.presenceDate);
      setTotals(payload.totals);
      setError("");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load live presence";
      const normalizedMessage = message.includes("No database connection is configured")
        ? "No database connection is configured."
        : message;
      setError(normalizedMessage);

      if (notifyOnError) {
        toast.error(normalizedMessage);
      }
    } finally {
      hasLoadedRef.current = true;
      requestInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPresence(selectedDate, true);
  }, [loadPresence, selectedDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPresence(selectedDate, false);
    }, refreshSeconds * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadPresence, refreshSeconds, selectedDate]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const visibleRows = normalizedSearch
      ? rows.filter((row) => {
          const fullName = row.fullName.toLowerCase();
          const username = row.username.toLowerCase();
          return fullName.includes(normalizedSearch) || username.includes(normalizedSearch);
        })
      : rows;

    return [...visibleRows].sort((left, right) => {
      const statusDiff = statusOrder(left.status) - statusOrder(right.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const leftCheckIn = left.firstCheckIn ?? "99:99";
      const rightCheckIn = right.firstCheckIn ?? "99:99";
      if (leftCheckIn !== rightCheckIn) {
        return leftCheckIn.localeCompare(rightCheckIn);
      }

      return left.username.localeCompare(right.username);
    });
  }, [rows, search]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-[var(--clockwork-green)]">Live Presence</h1>
            {error ? (
              <p className="max-w-xl rounded-lg border border-[var(--clockwork-error)]/40 bg-red-50 px-3 py-2 text-sm text-[var(--clockwork-error)] dark:bg-red-950/20">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-3 flex flex-col items-center gap-1">
            <Button
              variant="secondary"
              className="min-w-[132px] transform-gpu justify-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--clockwork-shadow-sm)]"
              onClick={() => void loadPresence(selectedDate, true)}
            >
              <span className="inline-flex w-4 items-center justify-center">
                {refreshing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </span>
              <span>Refresh</span>
            </Button>
            <p className="text-center text-xs text-[var(--clockwork-gray-500)]">
              Auto-refresh: {refreshSeconds}s
            </p>
          </div>
          <PageHelpButton
            title="Live Presence Help"
            overview="Monitor today attendance state in real-time and quickly identify who is still inside."
            steps={[
              "Pick a date to inspect attendance activity for that day.",
              "Use refresh or wait for auto-refresh every 30 seconds.",
              "Review first check-in, last check-out, status, and worked hours per employee.",
            ]}
          />
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <JalaliDatePicker
              label="Date"
              value={selectedDate}
              calendar={defaultCalendar}
              onChange={(nextDate) => setSelectedDate(nextDate)}
            />

            <Input
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by full name or username"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">Inside now</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">{totals.inside}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">Out today</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">{totals.out}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">Total seen today</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">{totals.totalSeen}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Presence Table ({formatDateCompact(presenceDate, defaultCalendar)})</CardTitle>
            {refreshing ? (
              <div className="flex items-center gap-1 text-xs text-[var(--clockwork-gray-500)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Updating
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--clockwork-gray-600)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading live presence...
            </div>
          ) : (
            <DataTable<PresenceRow>
              data={filteredRows}
              getRowKey={(row) => row.userId}
              emptyMessage="No attendance rows for selected date."
              columns={[
                {
                  key: "fullName",
                  header: "Name",
                  render: (row) => row.fullName,
                },
                {
                  key: "username",
                  header: "Username",
                  render: (row) => row.username,
                },
                {
                  key: "firstCheckIn",
                  header: "First Check-in",
                  render: (row) => row.firstCheckIn ?? "-",
                },
                {
                  key: "lastCheckOut",
                  header: "Last Check-out",
                  render: (row) => row.lastCheckOut ?? "-",
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => renderStatusBadge(row),
                },
                {
                  key: "workedHours",
                  header: "Worked Hours",
                  align: "right",
                  render: (row) => row.workedHours.toFixed(2),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--clockwork-border)] bg-[var(--clockwork-gray-50)]">
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[var(--clockwork-gray-700)]">
            <Users className="h-4 w-4 text-[var(--clockwork-green)]" />
            Data is served only from the local Electron API on 127.0.0.1.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
