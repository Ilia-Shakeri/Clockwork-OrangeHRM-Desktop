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
  usernameValidationRegex: "^[a-zA-Z0-9._-]+$",
  bulkScanMode: "combined",
};

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
  return store.get("settings");
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
  store.set("settings", nextSettings);
  return nextSettings;
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
