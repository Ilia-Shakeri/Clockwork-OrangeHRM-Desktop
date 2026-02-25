import ElectronStore from "electron-store";
import type {
  ConnectionPayload,
  ExportHistoryItem,
  PersistedState,
  UiSettings,
} from "./dtos";

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
  usernameValidationRegex: "^[a-zA-Z0-9._-]+$",
  bulkScanMode: "combined",
};

function normalizeSettings(settings: Partial<UiSettings> | null | undefined): UiSettings {
  const normalized: UiSettings = {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
  };

  if (normalized.defaultCalendar !== "gregorian" && normalized.defaultCalendar !== "shamsi") {
    normalized.defaultCalendar = "shamsi";
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
  return store.get("connection");
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
  store.set("connection", connection);
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

export function resetStore(store: ConfigStore): void {
  store.clear();
  store.set({
    connection: null,
    settings: DEFAULT_SETTINGS,
    exportHistory: [],
  });
}
