import { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDataService,
  DEFAULT_HOTKEY,
} from "./data-service.mjs";
import { findSteamInstalls } from "./steam-paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const configPath = join(app.getPath("userData"), "config.json");
const cacheDir = join(app.getPath("userData"), "cache");
const dataService = createDataService(configPath, cacheDir);
const iconPath = join(__dirname, "../build/icon.png");

const WINDOW = {
  width: 420,
  height: 580,
  minWidth: 360,
  minHeight: 420,
};

let mainWindow = null;
let currentHotkey = DEFAULT_HOTKEY;

function applyWindowSettings(settings) {
  if (!mainWindow) return;

  mainWindow.setMinimumSize(WINDOW.minWidth, WINDOW.minHeight);
  mainWindow.setSize(WINDOW.width, WINDOW.height, true);
  mainWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop));
  mainWindow.webContents.send("settings-changed", settings);
}

function registerHotkey(accelerator) {
  if (!app.isReady()) return false;

  const next = accelerator?.trim() || DEFAULT_HOTKEY;
  if (next === currentHotkey && globalShortcut.isRegistered(next)) {
    return true;
  }

  globalShortcut.unregister(currentHotkey);
  const ok = globalShortcut.register(next, toggleWindow);
  if (!ok) {
    globalShortcut.register(currentHotkey, toggleWindow);
    return false;
  }

  currentHotkey = next;
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    title: "Finder",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && (url.startsWith("http://") || url.startsWith("https://"))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("did-finish-load", async () => {
    const settings = await dataService.loadSettings();
    applyWindowSettings(settings);
    registerHotkey(settings.hotkey);
  });
}

function toggleWindow() {
  if (!mainWindow) return;

  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("focus-search");
}

ipcMain.handle("get-config", () => dataService.loadConfig());
ipcMain.handle("get-settings", () => dataService.loadSettings());
ipcMain.handle("save-settings", async (_e, partial) => {
  const previous = await dataService.loadSettings();
  const settings = await dataService.saveSettings(partial);
  applyWindowSettings(settings);

  if (partial.hotkey !== undefined) {
    const ok = registerHotkey(settings.hotkey);
    if (!ok) {
      const restored = await dataService.saveSettings({ hotkey: previous.hotkey });
      applyWindowSettings(restored);
      return { ...restored, hotkeyAssignFailed: true };
    }
  }

  return settings;
});
ipcMain.handle("save-config", (_e, contentPath) =>
  dataService.saveConfig(contentPath)
);
ipcMain.handle("check-path", (_e, contentPath) =>
  dataService.inspectPath(contentPath)
);
ipcMain.handle("load-data", (_e, contentPath, forceRefresh) =>
  dataService.loadData(contentPath, { forceRefresh: Boolean(forceRefresh) })
);
ipcMain.handle("get-steam-installs", () => findSteamInstalls());
ipcMain.handle("open-external", (_e, url) => {
  if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    return shell.openExternal(url);
  }
});
ipcMain.handle("pick-folder", async () => {
  const settings = await dataService.loadSettings();
  const title =
    settings.language === "ru"
      ? "Выберите папку Content"
      : "Select Content folder";
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title,
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

app.whenReady().then(async () => {
  const settings = await dataService.loadSettings();
  currentHotkey = settings.hotkey || DEFAULT_HOTKEY;
  createWindow();
  registerHotkey(currentHotkey);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
