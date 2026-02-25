import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Badge } from "@/app/components/Badge";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { PageHelpButton } from "@/components/PageHelpButton";
import type { DateDisplayCalendar, ExportHistoryItem } from "@/types/api";
import { formatDate, formatDateTime } from "@/lib/helpers";

export function Exports() {
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [defaultCalendar, setDefaultCalendar] = useState<DateDisplayCalendar>("shamsi");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = history.length > 0 && selectedIds.length === history.length;

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiClient.getExportHistory();
      setHistory(response.history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load export history");
    }
  }, []);

  useEffect(() => {
    const reload = () => {
      void loadHistory();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadHistory();
      }
    };

    apiClient
      .getSettings()
      .then((response) => setDefaultCalendar(response.settings.defaultCalendar))
      .catch(() => {
        // Keep default calendar fallback when settings are unavailable.
      });

    void loadHistory();
    window.addEventListener("clockwork:export-created", reload);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("clockwork:export-created", reload);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadHistory]);

  useEffect(() => {
    const validIds = new Set(history.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
  }, [history]);

  const handleOpen = async (filePath: string) => {
    const result = await window.clockwork.showItemInFolder(filePath);
    if (!result.ok) {
      toast.error("Unable to open file location.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }

      return [...current, id];
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(history.map((item) => item.id));
  };

  const handleClearSelected = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Clear ${selectedIds.length} selected export record(s)?`);
    if (!confirmed) {
      return;
    }

    setClearing(true);

    try {
      const response = await apiClient.deleteExportHistoryItems(selectedIds);
      setHistory(response.history);
      setSelectedIds([]);
      toast.success(`Cleared ${selectedIds.length} export record(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear selected exports");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Exports</h1>
        </div>

        <PageHelpButton
          title="Exports Help"
          overview="Track generated files and quickly open them in their folder."
          steps={[
            "This page updates automatically after each new export.",
            "Review format, date range, rows, and total hours for each item.",
            "Click folder icon to reveal the exported file on disk.",
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">Total Exports</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">{history.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">PDF</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              {history.filter((item) => item.format === "pdf").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--clockwork-gray-600)]">CSV</p>
            <p className="text-3xl font-semibold text-[var(--clockwork-gray-900)]">
              {history.filter((item) => item.format === "csv").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Export History</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={toggleSelectAll}
                disabled={history.length === 0 || clearing}
              >
                {allSelected ? "Unselect All" : "Select All"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleClearSelected()}
                disabled={selectedIds.length === 0 || clearing}
              >
                <Trash2 className="h-4 w-4" />
                Clear Selected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--clockwork-gray-500)]">No export records yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--clockwork-border)] p-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1 h-4 w-4 accent-[var(--clockwork-orange)]"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={item.format === "pdf" ? "warning" : "success"}>
                          {item.format.toUpperCase()}
                        </Badge>
                        <p className="truncate text-sm font-semibold text-[var(--clockwork-gray-900)]">{item.title}</p>
                      </div>

                      <p className="text-sm text-[var(--clockwork-gray-600)]">
                        {formatDate(item.from, defaultCalendar)} to {formatDate(item.to, defaultCalendar)} | {item.rows} rows | {item.totalHours.toFixed(2)} hrs
                      </p>
                      <p className="text-xs text-[var(--clockwork-gray-500)]">
                        {formatDateTime(item.createdAt, defaultCalendar)}
                      </p>
                      <p className="truncate text-xs text-[var(--clockwork-gray-500)]">{item.filePath}</p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => void handleOpen(item.filePath)}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
