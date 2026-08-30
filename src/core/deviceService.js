import {
  captureScreenshot,
  connect,
  installApk,
  launchPackage,
  listDevices,
  listUserPackages,
  pair,
  readBattery,
  readProperty,
  readStorage,
} from './adb.js';
import { interpretConnectResult, interpretPairResult } from './adbOutcome.js';
import { doctor } from './diagnostics.js';
import { getProfile, listProfiles } from './profiles.js';
import { listActiveRecordings, startRecording, stopRecording } from './recordingService.js';
import { getScrcpyCapabilities, launchScrcpy } from './scrcpy.js';
import {
  canLaunchVirtualWorkspace,
  getVirtualWorkspacePreset,
  listVirtualWorkspacePresets,
} from './virtualWorkspace.js';
import { normalizeAddress, normalizePackageName, normalizePairCode, normalizeSerial } from '../shared/validation.js';

function actionResult(result, fallback) {
  const message = (result.stdout || result.stderr || fallback || '').trim();
  if (result.code !== 0) throw new Error(message || `Command failed with exit code ${result.code}.`);
  return { ok: true, message };
}

function requireWirelessOutcome(outcome) {
  if (!outcome.ok) throw new Error(outcome.message || 'Wireless ADB operation failed.');
  return outcome;
}

export async function getDeviceSnapshot() {
  const report = await doctor();
  const devices = report.probes.devices.ok ? report.probes.devices.details : [];
  const capabilities = report.probes.scrcpy.ok
    ? await getScrcpyCapabilities({ refresh: true })
    : { newDisplay: false, flexDisplay: false, startApp: false };
  const compatibleVirtualPresets = listVirtualWorkspacePresets().filter((preset) =>
    canLaunchVirtualWorkspace(capabilities, getVirtualWorkspacePreset(preset.id)));
  return {
    devices,
    diagnostics: {
      adb: report.probes.adb,
      scrcpy: report.probes.scrcpy,
      devices: report.probes.devices,
      hints: report.hints,
    },
    profiles: listProfiles(),
    virtualWorkspace: {
      available: compatibleVirtualPresets.length > 0,
      capabilities,
      presets: compatibleVirtualPresets,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function requireReadyDevice(serial) {
  const normalized = normalizeSerial(serial);
  const devices = await listDevices();
  const device = devices.find((candidate) => candidate.serial === normalized);
  if (!device) throw new Error('That device is no longer connected. Refresh and try again.');
  if (device.state !== 'device') {
    throw new Error(`Device is ${device.state}. Resolve the connection warning before continuing.`);
  }
  return device;
}

export async function getDeviceDetails(serial) {
  const device = await requireReadyDevice(serial);
  const [manufacturer, model, androidVersion, sdk, battery, storage] = await Promise.all([
    readProperty(device.serial, 'ro.product.manufacturer'),
    readProperty(device.serial, 'ro.product.model'),
    readProperty(device.serial, 'ro.build.version.release'),
    readProperty(device.serial, 'ro.build.version.sdk'),
    readBattery(device.serial),
    readStorage(device.serial),
  ]);
  return {
    serial: device.serial,
    manufacturer: manufacturer || null,
    model: model || device.metadata.model?.replaceAll('_', ' ') || null,
    androidVersion: androidVersion || null,
    sdk: sdk ? Number(sdk) : null,
    battery,
    storage,
  };
}

export async function getUserApplications(serial) {
  const device = await requireReadyDevice(serial);
  return listUserPackages(device.serial);
}

export async function launchApplication(serial, packageName) {
  const device = await requireReadyDevice(serial);
  const normalizedPackage = normalizePackageName(packageName);
  const result = await launchPackage(device.serial, normalizedPackage);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0 || /No activities found|monkey aborted/i.test(output)) {
    throw new Error('This package does not expose a launchable activity.');
  }
  return { ok: true, message: `Opened ${normalizedPackage}.` };
}

export async function launchApplicationInVirtualWorkspace(serial, packageName, presetId = 'responsive') {
  const device = await requireReadyDevice(serial);
  const normalizedPackage = normalizePackageName(packageName);
  const packages = await listUserPackages(device.serial);
  if (!packages.includes(normalizedPackage)) {
    throw new Error('Reload the application list before opening a virtual workspace.');
  }

  const preset = getVirtualWorkspacePreset(presetId);
  const capabilities = await getScrcpyCapabilities();
  if (!canLaunchVirtualWorkspace(capabilities, preset)) {
    throw new Error('The installed scrcpy version does not support this virtual workspace preset.');
  }

  const pid = await launchScrcpy({
    serial: device.serial,
    startApp: normalizedPackage,
    ...preset.options,
  });
  return {
    ok: true,
    pid,
    packageName: normalizedPackage,
    preset: preset.id,
    message: `Opened ${normalizedPackage} in a ${preset.label} virtual workspace.`,
  };
}

export async function pairWireless(address, code) {
  const result = await pair(normalizeAddress(address), normalizePairCode(code));
  return requireWirelessOutcome(interpretPairResult(result));
}

export async function connectWireless(address) {
  const result = await connect(normalizeAddress(address));
  return requireWirelessOutcome(interpretConnectResult(result));
}

export async function mirrorDevice(serial, profileId = 'balanced') {
  const device = await requireReadyDevice(serial);
  const profile = getProfile(profileId);
  const pid = await launchScrcpy({ serial: device.serial, ...profile.options });
  return { ok: true, pid, profile: profile.id };
}

export async function installPackage(serial, apkPath) {
  const device = await requireReadyDevice(serial);
  if (typeof apkPath !== 'string' || !apkPath.toLowerCase().endsWith('.apk')) {
    throw new Error('Select a valid APK file.');
  }
  const result = await installApk(device.serial, apkPath, { replace: true });
  return actionResult(result, 'APK installed.');
}

export async function captureDeviceScreenshot(serial, filePath) {
  const device = await requireReadyDevice(serial);
  const result = await captureScreenshot(device.serial, filePath);
  return { ok: true, bytes: result.bytes, filePath };
}

export async function startDeviceRecording(serial, filePath, profileId = 'balanced', withPlayback = true) {
  const device = await requireReadyDevice(serial);
  return startRecording({ serial: device.serial, filePath, profileId, withPlayback });
}

export async function stopDeviceRecording(recordingId) {
  return stopRecording(recordingId);
}

export function getActiveRecordings() {
  return listActiveRecordings();
}
