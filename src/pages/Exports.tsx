import { useEffect, useState } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Badge } from "@/app/components/Badge";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import type { DateDisplayCalendar, ExportHistoryItem } from "@/types/api";
import { formatDate, formatDateTime } from "@/lib/helpers";

export function Exports() {
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultCalendar, setDefaultCalendar] = useState<DateDisplayCalendar>("shamsi");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getExportHistory();
      setHistory(response.history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load export history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient
      .getSettings()
      .then((response) => setDefaultCalendar(response.settings.defaultCalendar))
      .catch(() => {
        // Keep default calendar fallback when settings are unavailable.
      });

    void loadHistory();
  }, []);

  const handleOpen = async (filePath: string) => {
    const result = await window.clockwork.showItemInFolder(filePath);
    if (!result.ok) {
      toast.error("Unable to open file location.");
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Exports</h1>
        </div>

        <Button variant="secondary" onClick={() => void loadHistory()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
          <CardTitle>Export History</CardTitle>
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
