import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  connectWireless,
  getDeviceSnapshot,
  installPackage,
  mirrorDevice,
  pairWireless,
} from '../core/deviceService.js';
import { normalizeSerial } from '../shared/validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let mainWindow;

function serializeError(error) {
  return { ok: false, error: error instanceof Error ? error.message : 'Unexpected error.' };
}

async function safeAction(action) {
  try {
    return await action();
  } catch (error) {
    return serializeError(error);
  }
}

function registerIpc() {
  ipcMain.handle('device:snapshot', () => safeAction(async () => ({ ok: true, data: await getDeviceSnapshot() })));
  ipcMain.handle('device:pair', (_event, payload = {}) => safeAction(() => pairWireless(payload.address, payload.code)));
  ipcMain.handle('device:connect', (_event, payload = {}) => safeAction(() => connectWireless(payload.address)));
  ipcMain.handle('device:mirror', (_event, payload = {}) => safeAction(() => mirrorDevice(payload.serial, payload.profile)));
  ipcMain.handle('device:install-apk', (_event, payload = {}) => safeAction(async () => {
    const serial = normalizeSerial(payload.serial);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose an APK to install',
      properties: ['openFile'],
      filters: [{ name: 'Android package', extensions: ['apk'] }],
    });
    if (selection.canceled || selection.filePaths.length === 0) return { ok: false, canceled: true };
    return installPackage(serial, selection.filePaths[0]);
  }));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0b0d12',
    title: 'BLC Device Lab',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = undefined; });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
