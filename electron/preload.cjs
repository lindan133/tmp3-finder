const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tmp3", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (partial) => ipcRenderer.invoke("save-settings", partial),
  saveConfig: (contentPath) => ipcRenderer.invoke("save-config", contentPath),
  checkPath: (contentPath) => ipcRenderer.invoke("check-path", contentPath),
  loadData: (contentPath, forceRefresh) =>
    ipcRenderer.invoke("load-data", contentPath, forceRefresh),
  getSteamInstalls: () => ipcRenderer.invoke("get-steam-installs"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onFocusSearch: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("focus-search", listener);
    return () => ipcRenderer.removeListener("focus-search", listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (_e, settings) => callback(settings);
    ipcRenderer.on("settings-changed", listener);
    return () => ipcRenderer.removeListener("settings-changed", listener);
  },
});
