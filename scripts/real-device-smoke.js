#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import {
  adbVersion,
  captureScreenshot,
  listDevices,
  readBattery,
  readProperty,
  readStorage,
} from '../src/core/adb.js';
import { onRecordingEnded, startRecording, stopRecording } from '../src/core/recordingService.js';
import { scrcpyVersion } from '../src/core/scrcpy.js';
import { normalizeSerial } from '../src/shared/validation.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseArgs(argv) {
  const options = { serial: null, durationMs: 3000 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--serial') {
      options.serial = normalizeSerial(argv[index + 1]);
      index += 1;
    } else if (token === '--duration') {
      const seconds = Number(argv[index + 1]);
      if (!Number.isFinite(seconds) || seconds < 2 || seconds > 15) {
        throw new Error('Recording smoke duration must be between 2 and 15 seconds.');
      }
      options.durationMs = Math.round(seconds * 1000);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${token}`);
    }
  }
  return options;
}

export function selectReadyDevice(devices, requestedSerial = null) {
  const ready = devices.filter((device) => device.state === 'device');
  if (requestedSerial) {
    const device = devices.find((candidate) => candidate.serial === requestedSerial);
    if (!device) throw new Error(`Requested device ${requestedSerial} is not connected.`);
    if (device.state !== 'device') throw new Error(`Requested device ${requestedSerial} is ${device.state}, not ready.`);
    return device;
  }
  if (ready.length === 0) throw new Error('No ready Android device detected.');
  if (ready.length > 1) {
    throw new Error(`More than one ready device detected (${ready.map((device) => device.serial).join(', ')}). Re-run with --serial <device>.`);
  }
  return ready[0];
}

export function hasPngSignature(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function commandSummary(result, fallback) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`.trim();
  return text.split(/\r?\n/).find(Boolean) || fallback;
}

function pass(label, detail = '') {
  console.log(`PASS  ${label}${detail ? ` — ${detail}` : ''}`);
}

function info(label, detail = '') {
  console.log(`INFO  ${label}${detail ? ` — ${detail}` : ''}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requireSuccessfulProbe(label, probe, fallback) {
  const result = await probe();
  if (result.code !== 0) throw new Error(commandSummary(result, `${label} probe failed.`));
  pass(label, commandSummary(result, fallback));
  return result;
}

export async function runRealDeviceSmoke({ serial = null, durationMs = 3000 } = {}) {
  await requireSuccessfulProbe('ADB available', adbVersion, 'adb detected');
  await requireSuccessfulProbe('scrcpy available', scrcpyVersion, 'scrcpy detected');

  const devices = await listDevices();
  const device = selectReadyDevice(devices, serial);
  pass('Ready device', device.serial);

  const [manufacturer, model, androidVersion, sdk, battery, storage] = await Promise.all([
    readProperty(device.serial, 'ro.product.manufacturer'),
    readProperty(device.serial, 'ro.product.model'),
    readProperty(device.serial, 'ro.build.version.release'),
    readProperty(device.serial, 'ro.build.version.sdk'),
    readBattery(device.serial),
    readStorage(device.serial),
  ]);
  pass('Device inspection', `${[manufacturer, model].filter(Boolean).join(' ') || device.serial} · Android ${androidVersion || '?'} · API ${sdk || '?'}`);
  if (battery?.percentage !== null && battery?.percentage !== undefined) info('Battery', `${battery.percentage}%`);
  if (storage?.availableBytes) info('Storage free', `${Math.round(storage.availableBytes / 1024 / 1024)} MiB`);

  const artifactDir = await mkdtemp(join(tmpdir(), 'blc-device-lab-smoke-'));
  const screenshotPath = join(artifactDir, 'screenshot.png');
  const recordingPath = join(artifactDir, 'recording.mp4');
  const summaryPath = join(artifactDir, 'summary.json');

  const screenshot = await captureScreenshot(device.serial, screenshotPath);
  const screenshotBytes = await readFile(screenshotPath);
  if (screenshot.bytes <= 0 || !hasPngSignature(screenshotBytes)) {
    throw new Error('Screenshot was created but is not a valid non-empty PNG.');
  }
  pass('Screenshot', `${screenshot.bytes} bytes`);

  const endedEvents = [];
  const unsubscribe = onRecordingEnded((entry) => endedEvents.push(entry));
  let recording;
  try {
    recording = startRecording({
      serial: device.serial,
      filePath: recordingPath,
      profileId: 'latency',
      withPlayback: false,
    });
    pass('Recording started', `pid ${recording.pid}`);
    await sleep(durationMs);

    const earlyEnd = endedEvents.find((entry) => entry.id === recording.id);
    if (earlyEnd) {
      throw new Error(earlyEnd.error || `Recording ended before the smoke window completed (${earlyEnd.status}).`);
    }

    const stopped = await stopRecording(recording.id);
    if (stopped.status !== 'completed') {
      throw new Error(`Recording finalized with unexpected status: ${stopped.status}.`);
    }
    const recordingStats = await stat(recordingPath);
    if (recordingStats.size <= 0) throw new Error('Recording finalized but the output file is empty.');
    pass('Recording finalized', `${recordingStats.size} bytes`);
  } finally {
    unsubscribe();
  }

  const summary = {
    ok: true,
    testedAt: new Date().toISOString(),
    serial: device.serial,
    device: {
      manufacturer: manufacturer || null,
      model: model || null,
      androidVersion: androidVersion || null,
      sdk: sdk ? Number(sdk) : null,
      battery,
      storage,
    },
    artifacts: { screenshotPath, recordingPath },
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  pass('Real-device smoke', 'all automated checks passed');
  info('Artifacts', artifactDir);
  return { ...summary, artifactDir, summaryPath };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    await runRealDeviceSmoke(options);
  } catch (error) {
    console.error(`FAIL  ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
