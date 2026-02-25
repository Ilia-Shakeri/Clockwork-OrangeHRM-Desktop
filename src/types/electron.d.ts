export interface SaveDialogFilters {
  name: string;
  extensions: string[];
}

export interface SaveDialogRequest {
  title?: string;
  defaultPath?: string;
  filters?: SaveDialogFilters[];
}

export interface OpenDirectoryDialogRequest {
  title?: string;
  defaultPath?: string;
}

export interface ElectronBridge {
  getApiBaseUrl: () => Promise<string>;
  openSaveDialog: (
    options?: SaveDialogRequest,
  ) => Promise<{ canceled: boolean; filePath?: string }>;
  openDirectoryDialog: (
    options?: OpenDirectoryDialogRequest,
  ) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showItemInFolder: (filePath: string) => Promise<{ ok: boolean }>;
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  windowControls: {
    minimize: () => Promise<{ ok: boolean }>;
    toggleMaximize: () => Promise<{ ok: boolean; maximized?: boolean }>;
    close: () => Promise<{ ok: boolean }>;
  };
}

declare global {
  interface Window {
    clockwork: ElectronBridge;
  }
}

export {};
