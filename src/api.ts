import type {
  AppSettings,
  GameData,
  PathCheckResult,
  SteamInstall,
  UpdateInfo,
} from "./types";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface AppConfig {
  contentPath: string;
  defaultPath: string;
  settings: AppSettings;
}

function requireTauri(): void {
  if (!isTauri()) {
    throw new Error("TMP3 Finder requires the Tauri desktop runtime.");
  }
}

export async function fetchConfig(): Promise<AppConfig> {
  requireTauri();
  return invoke<AppConfig>("get_config");
}

export async function fetchSettings(): Promise<AppSettings> {
  requireTauri();
  return invoke<AppSettings>("get_settings");
}

export async function saveSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  requireTauri();
  return invoke<AppSettings & { hotkeyAssignFailed?: boolean }>(
    "save_settings",
    { partial }
  );
}

export async function saveConfig(contentPath: string): Promise<void> {
  await saveSettings({ contentPath });
}

export async function checkPath(path: string): Promise<PathCheckResult> {
  requireTauri();
  return invoke<PathCheckResult>("check_path", { contentPath: path });
}

export async function fetchSteamInstalls(): Promise<SteamInstall[]> {
  requireTauri();
  return invoke<SteamInstall[]>("get_steam_installs");
}

export async function pickFolder(): Promise<string | null> {
  requireTauri();
  const settings = await fetchSettings();
  return invoke<string | null>("pick_folder", { language: settings.language });
}

export async function loadGameData(
  contentPath?: string,
  forceRefresh = false
): Promise<GameData> {
  requireTauri();
  return invoke<GameData>("load_data", {
    contentPath: contentPath ?? null,
    forceRefresh,
  });
}

export async function checkDatabaseStale(
  contentPath: string,
  loadedFingerprint: string | null
): Promise<{ stale: boolean; fingerprint: string | null }> {
  requireTauri();
  return invoke("check_database_stale", {
    contentPath,
    loadedFingerprint,
  });
}

export function subscribeWindowFocus(callback: () => void): (() => void) | null {
  if (!isTauri()) return null;
  let unlisten: (() => void) | undefined;
  void listen("window-focus", () => callback()).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  requireTauri();
  return invoke<UpdateInfo>("check_for_updates");
}

export async function installUpdate(): Promise<void> {
  requireTauri();
  const { check } = await import("@tauri-apps/plugin-updater");
  const { relaunch } = await import("@tauri-apps/plugin-process");
  const update = await check();
  if (!update) {
    throw new Error("No update available");
  }
  await update.downloadAndInstall();
  await relaunch();
}

export async function openExternal(url: string): Promise<void> {
  requireTauri();
  await invoke("open_external", { url });
}

export function subscribeFocusSearch(callback: () => void): (() => void) | null {
  if (!isTauri()) return null;
  let unlisten: (() => void) | undefined;
  void listen("focus-search", () => callback()).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}

export function subscribeSettingsChanged(
  callback: (settings: AppSettings) => void
): (() => void) | null {
  if (!isTauri()) return null;
  let unlisten: (() => void) | undefined;
  void listen<AppSettings>("settings-changed", (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}

export function subscribeReloadDatabase(callback: () => void): (() => void) | null {
  if (!isTauri()) return null;
  let unlisten: (() => void) | undefined;
  void listen("reload-database", () => callback()).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}
