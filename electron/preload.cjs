const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  ping: () => ipcRenderer.invoke("ping"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateDownloadProgress: (callback) =>
    ipcRenderer.on("update-download-progress", (_event, info) =>
      callback(info)
    ),
  openFiscalMemory: () => ipcRenderer.invoke("fm-open-dialog"),
  parseFiscalMemory: (buffer) => ipcRenderer.invoke("fm-parse-buffer", buffer),
  saveFiscalMemoryAs: (data, defaultPath) =>
    ipcRenderer.invoke("fm-save-dialog", data, defaultPath),
  saveFiscalMemoryToPath: (filePath, data) =>
    ipcRenderer.invoke("fm-save-to-path", filePath, data),
  importZReports: () => ipcRenderer.invoke("zreports-import"),
});
