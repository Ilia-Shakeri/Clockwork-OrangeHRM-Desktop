import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { startLocalApiServer, type StartedApiServer } from "./backend/app-server";
import { createConfigStore } from "./backend/store";

let mainWindow: BrowserWindow | null = null;
let localApiServer: StartedApiServer | null = null;
let apiBaseUrl = "http://127.0.0.1:0";
let isQuitting = false;

const IPC_CHANNELS = {
  getApiBaseUrl: "clockwork:get-api-base-url",
  openSaveDialog: "clockwork:open-save-dialog",
  showItemInFolder: "clockwork:show-item-in-folder",
  windowMinimize: "clockwork:window-minimize",
  windowToggleMaximize: "clockwork:window-toggle-maximize",
  windowClose: "clockwork:window-close",
} as const;

function resolvePreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function resolveRendererUrl(): string {
  return process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5317";
}

function resolveRendererIndexPath(): string {
  return path.join(__dirname, "..", "dist", "index.html");
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getApiBaseUrl, async () => apiBaseUrl);

  ipcMain.handle(
    IPC_CHANNELS.openSaveDialog,
    async (_event, options?: Electron.SaveDialogOptions) => {
      const ownerWindow = BrowserWindow.getFocusedWindow() ?? mainWindow;
      if (ownerWindow) {
        return dialog.showSaveDialog(ownerWindow, options ?? {});
      }

      return dialog.showSaveDialog(options ?? {});
    },
  );

  ipcMain.handle(IPC_CHANNELS.showItemInFolder, async (_event, filePath: string) => {
    if (!filePath) {
      return { ok: false };
    }

    shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.windowMinimize, async () => {
    const focused = BrowserWindow.getFocusedWindow();
    focused?.minimize();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, async () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused) {
      return { ok: false };
    }

    if (focused.isMaximized()) {
      focused.unmaximize();
    } else {
      focused.maximize();
    }

    return { ok: true, maximized: focused.isMaximized() };
  });

  ipcMain.handle(IPC_CHANNELS.windowClose, async () => {
    const focused = BrowserWindow.getFocusedWindow();
    focused?.close();
    return { ok: true };
  });
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 740,
    title: "Clockwork OrangeHRM Desktop",
    backgroundColor: "#F7F7F7",
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(resolveRendererIndexPath());
  } else {
    await mainWindow.loadURL(resolveRendererUrl());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const store = createConfigStore();
  const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  const pythonScriptPath = path.join(appPath, "python", "generate_report_summary.py");

  localApiServer = await startLocalApiServer({
    store,
    appVersion: app.getVersion(),
    isDev: !app.isPackaged,
    pythonScriptPath,
    logger: (message, details) => {
      if (!app.isPackaged) {
        // eslint-disable-next-line no-console
        console.log(`[clockwork-api] ${message}`, details ?? "");
      }
    },
  });

  apiBaseUrl = `http://127.0.0.1:${localApiServer.port}`;
  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
}

app.on("before-quit", async () => {
  isQuitting = true;
  if (localApiServer) {
    try {
      await localApiServer.stop();
    } catch {
      // Ignore shutdown errors during quit.
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
    return;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

bootstrap().catch((error) => {
  dialog.showErrorBox("Clockwork Startup Error", error instanceof Error ? error.message : String(error));
  app.exit(1);
});
