import type {
  ConnectionPayload,
  DateRangeInput,
  ExportHistoryItem,
  ExportMeta,
  ExportFormat,
  HealthResponse,
  PythonStatusResponse,
  PythonSummaryResponse,
  ReportPayload,
  ResolvedUserResult,
  SettingsResponse,
  UiSettings,
  UserLookupResult,
} from "@/types/api";

interface RequestInitJson extends RequestInit {
  json?: unknown;
}

class ApiClient {
  private baseUrlPromise: Promise<string> | null = null;

  private async getBaseUrl(): Promise<string> {
    if (!this.baseUrlPromise) {
      this.baseUrlPromise = window.clockwork.getApiBaseUrl();
    }

    return this.baseUrlPromise;
  }

  private async request<T>(path: string, init?: RequestInitJson): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const headers = new Headers(init?.headers ?? {});
    let body = init?.body;

    if (init?.json !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.json);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      body,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }

    return payload as T;
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/health");
  }

  connect(connection: ConnectionPayload): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/api/connect", {
      method: "POST",
      json: connection,
    });
  }

  getSettings(): Promise<SettingsResponse> {
    return this.request<SettingsResponse>("/api/settings");
  }

  saveSettings(settings: UiSettings): Promise<{ settings: UiSettings }> {
    return this.request<{ settings: UiSettings }>("/api/settings", {
      method: "POST",
      json: settings,
    });
  }

  searchUsers(query: string): Promise<{ users: UserLookupResult[] }> {
    const encoded = encodeURIComponent(query);
    return this.request<{ users: UserLookupResult[] }>(`/api/users?query=${encoded}`);
  }

  resolveUsers(usernames: string[]): Promise<{ users: ResolvedUserResult[] }> {
    return this.request<{ users: ResolvedUserResult[] }>("/api/users/resolve", {
      method: "POST",
      json: { usernames },
    });
  }

  runReport(payload: {
    userIds: string[];
    dateRange: DateRangeInput;
  }): Promise<ReportPayload> {
    return this.request<ReportPayload>("/api/reports", {
      method: "POST",
      json: payload,
    });
  }

  exportReport(payload: {
    format: ExportFormat;
    reportPayload: ReportPayload;
    meta: ExportMeta;
    savePath: string;
  }): Promise<{ ok: boolean; filePath: string; bytes: number }> {
    return this.request<{ ok: boolean; filePath: string; bytes: number }>("/api/export", {
      method: "POST",
      json: payload,
    });
  }

  getExportHistory(): Promise<{ history: ExportHistoryItem[] }> {
    return this.request<{ history: ExportHistoryItem[] }>("/api/exports/history");
  }

  getPythonStatus(): Promise<PythonStatusResponse> {
    return this.request<PythonStatusResponse>("/api/python/status");
  }

  generatePythonSummary(reportPayload: ReportPayload): Promise<PythonSummaryResponse> {
    return this.request<PythonSummaryResponse>("/api/python/summary", {
      method: "POST",
      json: reportPayload,
    });
  }
}

export const apiClient = new ApiClient();
