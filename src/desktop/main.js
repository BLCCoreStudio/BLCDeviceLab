import { randomUUID } from 'node:crypto';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureDeviceScreenshot,
  connectWireless,
  getActiveRecordings,
  getDeviceDetails,
  getDeviceSnapshot,
  getUserApplications,
  installPackage,
  launchApplication,
  mirrorDevice,
  pairWireless,
  startDeviceRecording,
  stopDeviceRecording,
} from '../core/deviceService.js';
import { readCaptureHistory, upsertCaptureHistory } from '../core/captureHistory.js';
import { onRecordingEnded } from '../core/recordingService.js';
import { normalizeSerial } from '../shared/validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let mainWindow;

function captureHistoryPath() {
  return join(app.getPath('userData'), 'capture-history.json');
}

function captureView(entry) {
  return {
    id: entry.id,
    type: entry.type,
    status: entry.status,
    serial: entry.serial,
    fileName: entry.filePath ? basename(entry.filePath) : null,
    profileId: entry.profileId || null,
    createdAt: entry.createdAt || entry.startedAt || null,
    startedAt: entry.startedAt || null,
    endedAt: entry.endedAt || null,
    bytes: entry.bytes ?? null,
  };
}

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

async function persistRecording(recording) {
  const entry = { ...recording, type: 'recording' };
  await upsertCaptureHistory(captureHistoryPath(), entry);
  return entry;
}

function registerIpc() {
  ipcMain.handle('device:snapshot', () => safeAction(async () => ({ ok: true, data: await getDeviceSnapshot() })));
  ipcMain.handle('device:details', (_event, payload = {}) => safeAction(async () => ({ ok: true, data: await getDeviceDetails(payload.serial) })));
  ipcMain.handle('device:apps', (_event, payload = {}) => safeAction(async () => ({ ok: true, data: await getUserApplications(payload.serial) })));
  ipcMain.handle('device:launch-app', (_event, payload = {}) => safeAction(() => launchApplication(payload.serial, payload.packageName)));
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

  ipcMain.handle('capture:screenshot', (_event, payload = {}) => safeAction(async () => {
    const serial = normalizeSerial(payload.serial);
    const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Save device screenshot',
      defaultPath: `BLC-Screenshot-${stamp}.png`,
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    });
    if (selection.canceled || !selection.filePath) return { ok: false, canceled: true };
    const result = await captureDeviceScreenshot(serial, selection.filePath);
    const entry = {
      id: randomUUID(),
      type: 'screenshot',
      status: 'completed',
      serial,
      filePath: selection.filePath,
      bytes: result.bytes,
      createdAt: new Date().toISOString(),
    };
    await upsertCaptureHistory(captureHistoryPath(), entry);
    return { ok: true, entry: captureView(entry) };
  }));

  ipcMain.handle('capture:start-recording', (_event, payload = {}) => safeAction(async () => {
    const serial = normalizeSerial(payload.serial);
    const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Save device recording',
      defaultPath: `BLC-Recording-${stamp}.mp4`,
      filters: [
        { name: 'MP4 video', extensions: ['mp4'] },
        { name: 'Matroska video', extensions: ['mkv'] },
      ],
    });
    if (selection.canceled || !selection.filePath) return { ok: false, canceled: true };
    const recording = await startDeviceRecording(serial, selection.filePath, payload.profile, true);
    const entry = await persistRecording(recording);
    return { ok: true, recording: captureView(entry) };
  }));

  ipcMain.handle('capture:stop-recording', (_event, payload = {}) => safeAction(async () => {
    const recording = await stopDeviceRecording(String(payload.id || ''));
    const entry = await persistRecording(recording);
    return { ok: true, recording: captureView(entry) };
  }));

  ipcMain.handle('capture:state', () => safeAction(async () => {
    const history = await readCaptureHistory(captureHistoryPath());
    return {
      ok: true,
      data: {
        active: getActiveRecordings().map((entry) => captureView({ ...entry, type: 'recording' })),
        history: history.map(captureView),
      },
    };
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
  onRecordingEnded((recording) => {
    persistRecording(recording).catch(() => {});
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
