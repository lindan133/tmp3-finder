/// <reference types="vite/client" />

import type {
  AppSettings,
  GameData,
  PathCheckResult,
  SteamInstall,
} from "./types";

interface Tmp3Api {
  getConfig(): Promise<{
    contentPath: string;
    defaultPath: string;
    settings: AppSettings;
  }>;
  getSettings(): Promise<AppSettings>;
  saveSettings(partial: Partial<AppSettings>): Promise<AppSettings>;
  saveConfig(contentPath: string): Promise<string>;
  checkPath(contentPath: string): Promise<PathCheckResult>;
  loadData(contentPath?: string, forceRefresh?: boolean): Promise<GameData>;
  getSteamInstalls(): Promise<SteamInstall[]>;
  pickFolder(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  onFocusSearch(callback: () => void): () => void;
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void;
}

declare global {
  interface Window {
    tmp3?: Tmp3Api;
  }
}

export {};
