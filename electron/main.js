import { app, BrowserWindow, ipcMain, dialog } from "electron";
import updaterPkg from "electron-updater";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import fs from "fs";
import iconv from "iconv-lite";
import { parseZReportsFromText } from "./lib/ej-zreport-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { autoUpdater } = updaterPkg;
let mainWindow;
const require = createRequire(import.meta.url);
const {
  buildDP25FiscalMemory,
  loadDP25File,
  parseDP25FiscalMemory,
  saveDP25File,
} = require("./lib/dp-fm-parser.cjs");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const devServerURL =
    process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

  if (
    process.env.NODE_ENV === "development" ||
    process.env.VITE_DEV_SERVER_URL
  ) {
    mainWindow.loadURL(devServerURL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("download-progress", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-download-progress", info);
    }
  });

  ipcMain.handle("check-for-updates", async () => {
    if (!app.isPackaged) {
      return {
        status: "unavailable",
        message: "Updates are only available in packaged builds.",
      };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      const version = result?.updateInfo?.version;

      if (!version || version === app.getVersion()) {
        return { status: "up-to-date" };
      }

      await autoUpdater.downloadUpdate();
      return { status: "downloaded", version };
    } catch (error) {
      const message = error?.message || "Unable to check for updates.";
      if (
        message.includes("No published versions") ||
        message.includes("No update available")
      ) {
        return { status: "up-to-date" };
      }
      return { status: "error", message };
    }
  });

  ipcMain.handle("install-update", async () => {
    if (!app.isPackaged) {
      return {
        status: "unavailable",
        message: "Installation is only available in packaged builds.",
      };
    }
    try {
      autoUpdater.quitAndInstall();
      return { status: "installing" };
    } catch (error) {
      return {
        status: "error",
        message: error?.message || "Failed to start update installation.",
      };
    }
  });

  ipcMain.handle("fm-open-dialog", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Open Fiscal Memory dump",
      properties: ["openFile"],
      filters: [{ name: "Binary", extensions: ["bin", "*"] }],
    });
    if (canceled || filePaths.length === 0) return null;
    const filePath = filePaths[0];
    const data = await loadDP25File(filePath);
    return { filePath, data };
  });

  ipcMain.handle("fm-parse-buffer", async (_event, buffer) => {
    return parseDP25FiscalMemory(Buffer.from(buffer));
  });

  ipcMain.handle("fm-save-dialog", async (_event, data, defaultPath) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Fiscal Memory dump",
      defaultPath: defaultPath || "fiscal-memory.bin",
      filters: [{ name: "Binary", extensions: ["bin"] }],
    });
    if (canceled || !filePath) return null;
    await saveDP25File(filePath, data);
    return { filePath, success: true };
  });

  ipcMain.handle("fm-save-to-path", async (_event, filePath, data) => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await saveDP25File(filePath, data);
    return { filePath, success: true };
  });

  ipcMain.handle("zreports-import", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Open Z report text file",
      properties: ["openFile"],
      filters: [{ name: "Text", extensions: ["txt", "log"] }],
    });
    if (canceled || filePaths.length === 0) return null;
    const filePath = filePaths[0];
    const buffer = await fs.promises.readFile(filePath);
    const content = iconv.decode(buffer, "windows-1251");
    const reports = parseZReportsFromText(content);
    return { filePath, reports };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("ping", () => "pong");
