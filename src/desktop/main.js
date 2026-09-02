import { randomUUID } from 'node:crypto';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDevices } from '../core/adb.js';
import { DeviceMonitor, planReconnects } from '../core/deviceMonitor.js';
import {
  captureDeviceScreenshot,
  connectWireless,
  getActiveRecordings,
  getDeviceDetails,
  getDeviceSnapshot,
  getUserApplications,
  installPackage,
  launchApplication,
  launchApplicationInVirtualWorkspace,
  mirrorDevice,
  pairWireless,
  startDeviceRecording,
  stopDeviceRecording,
} from '../core/deviceService.js';
import { readCaptureHistory, upsertCaptureHistory } from '../core/captureHistory.js';
import { onRecordingEnded } from '../core/recordingService.js';
import { readWorkspaceSession, writeWorkspaceSession } from '../core/workspaceSession.js';
import { normalizeAddress, normalizeSerial } from '../shared/validation.js';
import { assertTrustedRendererEvent, isTrustedRendererUrl } from './security.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RENDERER_ENTRY = join(__dirname, 'renderer', 'index.html');
const MONITOR_INTERVAL_MS = 2500;
const RECONNECT_CHECK_MS = 5000;
const RECONNECT_COOLDOWN_MS = 15000;
let mainWindow;
let deviceMonitor;
let reconnectTimer;
let reconnectBusy = false;
let latestDevices = [];
const knownWirelessEndpoints = new Set();
const reconnectAttempts = new Map();

function captureHistoryPath() {
  return join(app.getPath('userData'), 'capture-history.json');
}

function workspaceSessionPath() {
  return join(app.getPath('userData'), 'workspace-session.json');
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

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

async function saveWorkspacePreferences(patch) {
  return writeWorkspaceSession(workspaceSessionPath(), patch);
}

async function attemptSelfHealingReconnect() {
  if (reconnectBusy || knownWirelessEndpoints.size === 0) return;
  const addresses = planReconnects(
    [...knownWirelessEndpoints],
    latestDevices,
    reconnectAttempts,
    Date.now(),
    RECONNECT_COOLDOWN_MS,
  );
  if (addresses.length === 0) return;

  reconnectBusy = true;
  try {
    for (const address of addresses.slice(0, 3)) {
      reconnectAttempts.set(address, Date.now());
      try {
        await connectWireless(address);
        sendToRenderer('device:self-heal', { address, ok: true });
      } catch {
        sendToRenderer('device:self-heal', { address, ok: false });
      }
    }
    await deviceMonitor?.poll({ force: true });
  } finally {
    reconnectBusy = false;
  }
}

function startBackgroundDeviceServices() {
  if (deviceMonitor) return;
  deviceMonitor = new DeviceMonitor({
    scan: listDevices,
    intervalMs: MONITOR_INTERVAL_MS,
    onUpdate: async (payload) => {
      latestDevices = payload.devices;
      sendToRenderer('device:update', payload);
    },
    onError: async (error) => {
      sendToRenderer('device:monitor-error', { message: error instanceof Error ? error.message : 'Device monitor failed.' });
    },
  });
  deviceMonitor.start();
  reconnectTimer = setInterval(() => { void attemptSelfHealingReconnect(); }, RECONNECT_CHECK_MS);
  reconnectTimer.unref?.();
}

function stopBackgroundDeviceServices() {
  deviceMonitor?.stop();
  deviceMonitor = undefined;
  if (reconnectTimer) clearInterval(reconnectTimer);
  reconnectTimer = undefined;
}

function trustedHandle(channel, listener) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedRendererEvent(event, RENDERER_ENTRY, mainWindow?.webContents.id);
    return listener(event, ...args);
  });
}

function registerIpc() {
  trustedHandle('device:snapshot', () => safeAction(async () => ({ ok: true, data: await getDeviceSnapshot() })));
  trustedHandle('device:details', (_event, payload = {}) => safeAction(async () => ({ ok: true, data: await getDeviceDetails(payload.serial) })));
  trustedHandle('device:apps', (_event, payload = {}) => safeAction(async () => ({ ok: true, data: await getUserApplications(payload.serial) })));
  trustedHandle('device:launch-app', (_event, payload = {}) => safeAction(() => launchApplication(payload.serial, payload.packageName)));
  trustedHandle('device:launch-virtual-app', (_event, payload = {}) => safeAction(() =>
    launchApplicationInVirtualWorkspace(payload.serial, payload.packageName, payload.preset)));
  trustedHandle('device:pair', (_event, payload = {}) => safeAction(() => pairWireless(payload.address, payload.code)));
  trustedHandle('device:connect', (_event, payload = {}) => safeAction(async () => {
    const address = normalizeAddress(payload.address);
    const result = await connectWireless(address);
    knownWirelessEndpoints.add(address);
    reconnectAttempts.delete(address);
    await saveWorkspacePreferences({ preferredSerial: address });
    await deviceMonitor?.poll({ force: true });
    return result;
  }));
  trustedHandle('device:mirror', (_event, payload = {}) => safeAction(async () => {
    const result = await mirrorDevice(payload.serial, payload.profile);
    await saveWorkspacePreferences({ preferredSerial: payload.serial, preferredProfile: payload.profile });
    return result;
  }));
  trustedHandle('workspace:session', () => safeAction(async () => ({ ok: true, data: await readWorkspaceSession(workspaceSessionPath()) })));
  trustedHandle('workspace:update', (_event, payload = {}) => safeAction(async () => ({
    ok: true,
    data: await saveWorkspacePreferences({
      preferredSerial: payload.preferredSerial,
      preferredProfile: payload.preferredProfile,
    }),
  })));
  trustedHandle('device:install-apk', (_event, payload = {}) => safeAction(async () => {
    const serial = normalizeSerial(payload.serial);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose an APK to install',
      properties: ['openFile'],
      filters: [{ name: 'Android package', extensions: ['apk'] }],
    });
    if (selection.canceled || selection.filePaths.length === 0) return { ok: false, canceled: true };
    return installPackage(serial, selection.filePaths[0]);
  }));

  trustedHandle('capture:screenshot', (_event, payload = {}) => safeAction(async () => {
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

  trustedHandle('capture:start-recording', (_event, payload = {}) => safeAction(async () => {
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
    await saveWorkspacePreferences({ preferredSerial: serial, preferredProfile: payload.profile });
    const entry = await persistRecording(recording);
    return { ok: true, recording: captureView(entry) };
  }));

  trustedHandle('capture:stop-recording', (_event, payload = {}) => safeAction(async () => {
    const recording = await stopDeviceRecording(String(payload.id || ''));
    const entry = await persistRecording(recording);
    return { ok: true, recording: captureView(entry) };
  }));

  trustedHandle('capture:state', () => safeAction(async () => {
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
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#070b13',
    title: 'BLC Device Lab',
    icon: join(__dirname, 'assets', 'app-icon.png'),
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
    if (!isTrustedRendererUrl(url, RENDERER_ENTRY)) event.preventDefault();
  });

  mainWindow.loadFile(RENDERER_ENTRY);
  mainWindow.on('closed', () => { mainWindow = undefined; });
}

app.whenReady().then(() => {
  createWindow();
  registerIpc();
  onRecordingEnded((recording) => {
    persistRecording(recording).catch(() => {});
  });
  startBackgroundDeviceServices();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', stopBackgroundDeviceServices);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
