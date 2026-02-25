import ElectronStore from "electron-store";
import type {
  ConnectionPayload,
  ExportHistoryItem,
  PersistedState,
  UserGroup,
  UiSettings,
} from "./dtos";
import { normalizeConnectionPayload } from "./db/index";

export interface ConfigStore {
  get<Key extends keyof PersistedState>(key: Key): PersistedState[Key];
  set<Key extends keyof PersistedState>(
    key: Key,
    value: PersistedState[Key],
  ): void;
  set(value: PersistedState): void;
  clear(): void;
}

const DEFAULT_SETTINGS: UiSettings = {
  theme: "light",
  defaultExportFormat: "pdf",
  defaultDatePreset: "current",
  defaultCalendar: "shamsi",
  defaultPresenceRefreshSeconds: 30,
  usernameValidationRegex: "^[A-Za-z]{2}\\.[A-Za-z][A-Za-z0-9_-]*$",
};

function normalizeSettings(settings: Partial<UiSettings> | null | undefined): UiSettings {
  const normalized: UiSettings = {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
  };

  if (normalized.defaultCalendar !== "gregorian" && normalized.defaultCalendar !== "shamsi") {
    normalized.defaultCalendar = "shamsi";
  }

  const allowedRefreshIntervals = new Set([15, 30, 60, 120, 300]);
  if (!allowedRefreshIntervals.has(normalized.defaultPresenceRefreshSeconds)) {
    normalized.defaultPresenceRefreshSeconds = DEFAULT_SETTINGS.defaultPresenceRefreshSeconds;
  }

  return normalized;
}

export function createConfigStore(): ConfigStore {
  return new ElectronStore<PersistedState>({
    name: "clockwork-config",
    defaults: {
      connection: null,
      settings: DEFAULT_SETTINGS,
      exportHistory: [],
      userGroups: [],
    },
  }) as unknown as ConfigStore;
}

export function getSettings(store: ConfigStore): UiSettings {
  const raw = store.get("settings") as UiSettings | Partial<UiSettings> | null;
  const normalized = normalizeSettings(raw);

  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    store.set("settings", normalized);
  }

  return normalized;
}

export function getConnection(
  store: ConfigStore,
): ConnectionPayload | null {
  const raw = store.get("connection") as
    | ConnectionPayload
    | Partial<ConnectionPayload>
    | null;
  const normalized = normalizeConnectionPayload(raw);

  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    store.set("connection", normalized);
  }

  return normalized;
}

export function updateSettings(
  store: ConfigStore,
  nextSettings: UiSettings,
): UiSettings {
  const normalized = normalizeSettings(nextSettings);
  store.set("settings", normalized);
  return normalized;
}

export function saveConnection(
  store: ConfigStore,
  connection: ConnectionPayload,
): void {
  const normalized = normalizeConnectionPayload(connection);
  store.set("connection", normalized);
}

export function getExportHistory(
  store: ConfigStore,
): ExportHistoryItem[] {
  return store.get("exportHistory");
}

export function addExportHistory(
  store: ConfigStore,
  item: ExportHistoryItem,
): ExportHistoryItem[] {
  const previous = store.get("exportHistory");
  const next = [item, ...previous].slice(0, 500);
  store.set("exportHistory", next);
  return next;
}

export function removeExportHistoryByIds(
  store: ConfigStore,
  ids: string[],
): ExportHistoryItem[] {
  if (ids.length === 0) {
    return store.get("exportHistory");
  }

  const idSet = new Set(ids);
  const previous = store.get("exportHistory");
  const next = previous.filter((item) => !idSet.has(item.id));
  store.set("exportHistory", next);
  return next;
}

export function clearExportHistory(store: ConfigStore): ExportHistoryItem[] {
  store.set("exportHistory", []);
  return [];
}

export function getUserGroups(store: ConfigStore): UserGroup[] {
  return store.get("userGroups");
}

export function replaceUserGroups(
  store: ConfigStore,
  groups: UserGroup[],
): UserGroup[] {
  const normalized = groups.map((group) => ({
    ...group,
    name: group.name.trim(),
    description: group.description?.trim() || undefined,
    memberIds: Array.from(
      new Set(group.memberIds.map((memberId) => memberId.trim()).filter(Boolean)),
    ),
  }));
  store.set("userGroups", normalized);
  return normalized;
}

export function resetStore(store: ConfigStore): void {
  store.clear();
  store.set({
    connection: null,
    settings: DEFAULT_SETTINGS,
    exportHistory: [],
    userGroups: [],
  });
}
