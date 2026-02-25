import { contextBridge, ipcRenderer } from "electron";

export interface SaveDialogFilters {
  name: string;
  extensions: string[];
}

export interface SaveDialogRequest {
  title?: string;
  defaultPath?: string;
  filters?: SaveDialogFilters[];
}

const api = {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke("clockwork:get-api-base-url"),
  openSaveDialog: (options?: SaveDialogRequest): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke("clockwork:open-save-dialog", options),
  showItemInFolder: (filePath: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("clockwork:show-item-in-folder", filePath),
  openExternal: (url: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("clockwork:open-external", url),
  windowControls: {
    minimize: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("clockwork:window-minimize"),
    toggleMaximize: (): Promise<{ ok: boolean; maximized?: boolean }> =>
      ipcRenderer.invoke("clockwork:window-toggle-maximize"),
    close: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("clockwork:window-close"),
  },
};

contextBridge.exposeInMainWorld("clockwork", api);
