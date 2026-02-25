import type {
  AppUser,
  ConnectionPayload,
  DateRangeInput,
  ExportHistoryItem,
  ExportMeta,
  ExportFormat,
  HealthResponse,
  PresenceResponse,
  PythonStatusResponse,
  PythonSummaryResponse,
  ReportPayload,
  SettingsResponse,
  UiSettings,
  UserGroup,
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

  getUsers(params?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: AppUser[] }> {
    const searchParams = new URLSearchParams();
    if (params?.query) {
      searchParams.set("query", params.query);
    }
    if (params?.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set("offset", String(params.offset));
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<{ users: AppUser[] }>(`/api/users${suffix}`);
  }

  getUserGroups(): Promise<{ groups: UserGroup[] }> {
    return this.request<{ groups: UserGroup[] }>("/api/user-groups");
  }

  createUserGroup(payload: {
    name: string;
    description?: string;
    memberIds: string[];
  }): Promise<{ group: UserGroup; groups: UserGroup[] }> {
    return this.request<{ group: UserGroup; groups: UserGroup[] }>("/api/user-groups", {
      method: "POST",
      json: payload,
    });
  }

  updateUserGroup(
    groupId: string,
    payload: {
      name?: string;
      description?: string | null;
      memberIds?: string[];
    },
  ): Promise<{ group: UserGroup; groups: UserGroup[] }> {
    return this.request<{ group: UserGroup; groups: UserGroup[] }>(
      `/api/user-groups/${encodeURIComponent(groupId)}`,
      {
        method: "PATCH",
        json: payload,
      },
    );
  }

  deleteUserGroup(groupId: string): Promise<{ ok: boolean; groups: UserGroup[] }> {
    return this.request<{ ok: boolean; groups: UserGroup[] }>(
      `/api/user-groups/${encodeURIComponent(groupId)}`,
      {
        method: "DELETE",
      },
    );
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

  getPresence(dateIso?: string): Promise<PresenceResponse> {
    const query = dateIso ? `?date=${encodeURIComponent(dateIso)}` : "";
    return this.request<PresenceResponse>(`/api/presence${query}`);
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

  deleteExportHistoryItems(ids: string[]): Promise<{ ok: boolean; history: ExportHistoryItem[] }> {
    return this.request<{ ok: boolean; history: ExportHistoryItem[] }>("/api/exports/history/delete", {
      method: "POST",
      json: { ids },
    });
  }

  clearExportHistory(): Promise<{ ok: boolean; history: ExportHistoryItem[] }> {
    return this.request<{ ok: boolean; history: ExportHistoryItem[] }>("/api/exports/history", {
      method: "DELETE",
    });
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
