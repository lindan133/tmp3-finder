import type {
  AppSettings,
  GameData,
  PathCheckResult,
  SteamInstall,
} from "./types";

export interface AppConfig {
  contentPath: string;
  defaultPath: string;
  settings: AppSettings;
}

function isElectronApp(): boolean {
  return (
    typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")
  );
}

async function getElectronApi() {
  if (window.tmp3) return window.tmp3;
  if (!isElectronApp()) return null;

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 50));
    if (window.tmp3) return window.tmp3;
  }

  throw new Error(
    "Electron API is unavailable. Restart the app with npm run dev"
  );
}

async function useWebApi() {
  if (isElectronApp()) {
    await getElectronApi();
    return false;
  }
  return true;
}

export async function fetchConfig(): Promise<AppConfig> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.getConfig();
  }

  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Failed to load settings");
  const data = await res.json();
  return {
    contentPath: data.contentPath,
    defaultPath: data.defaultPath,
    settings: {
      contentPath: data.contentPath,
      alwaysOnTop: false,
      soundOnMatch: true,
      autoCopyOnMatch: false,
      theme: "dark",
      hotkey: "CommandOrControl+Shift+F",
      language: "en",
      ...data.settings,
    },
  };
}

export async function fetchSettings(): Promise<AppSettings> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.getSettings();
  }
  const config = await fetchConfig();
  return config.settings;
}

export async function saveSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.saveSettings(partial);
  }

  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

export async function saveConfig(contentPath: string): Promise<void> {
  await saveSettings({ contentPath });
}

export async function checkPath(path: string): Promise<PathCheckResult> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.checkPath(path);
  }

  const res = await fetch(`/api/check-path?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    return {
      ok: false,
      contentPath: path,
      files: { trivia: false, finalRound: false, subjective: false, vo: false },
      missingRequired: [],
      missingOptional: [],
    };
  }
  return res.json();
}

export async function fetchSteamInstalls(): Promise<SteamInstall[]> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.getSteamInstalls();
  }

  const res = await fetch("/api/steam-installs");
  if (!res.ok) return [];
  return res.json();
}

export async function pickFolder(): Promise<string | null> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.pickFolder();
  }
  return null;
}

export async function loadGameData(
  contentPath?: string,
  forceRefresh = false
): Promise<GameData> {
  if (!(await useWebApi())) {
    return (await getElectronApi())!.loadData(contentPath, forceRefresh);
  }

  const params = new URLSearchParams();
  if (contentPath) params.set("path", contentPath);
  if (forceRefresh) params.set("refresh", "1");
  const query = params.toString();
  const url = query ? `/api/data?${query}` : "/api/data";
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to load game data");
  }
  return res.json();
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function openExternal(url: string): Promise<void> {
  if (!(await useWebApi())) {
    await (await getElectronApi())!.openExternal(url);
    return;
  }
  window.location.assign(url);
}

export function subscribeFocusSearch(callback: () => void): (() => void) | null {
  if (!window.tmp3?.onFocusSearch) return null;
  return window.tmp3.onFocusSearch(callback);
}

export function subscribeSettingsChanged(
  callback: (settings: AppSettings) => void
): (() => void) | null {
  if (!window.tmp3?.onSettingsChanged) return null;
  return window.tmp3.onSettingsChanged(callback);
}
