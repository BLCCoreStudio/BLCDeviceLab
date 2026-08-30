import { writeFile } from 'node:fs/promises';
import { assertCapturePath } from './capturePath.js';
import { run, runBinary } from './command.js';
import { parseBattery, parsePackages, parseStorage } from './deviceInfo.js';

export function parseDevices(output) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => line.startsWith('List of devices attached'));
  if (start < 0) return [];

  return lines.slice(start + 1).map((line) => {
    const [serial, state, ...tokens] = line.split(/\s+/);
    const metadata = Object.fromEntries(
      tokens
        .filter((token) => token.includes(':'))
        .map((token) => {
          const index = token.indexOf(':');
          return [token.slice(0, index), token.slice(index + 1)];
        }),
    );
    return { serial, state, metadata, raw: line };
  });
}

function shell(serial, args) {
  return run('adb', ['-s', serial, 'shell', ...args]);
}

export async function adbVersion() {
  return run('adb', ['version']);
}

export async function listDevices() {
  const result = await run('adb', ['devices', '-l']);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `adb exited with ${result.code}`);
  }
  return parseDevices(result.stdout);
}

export async function pair(address, code) {
  return run('adb', ['pair', address, code]);
}

export async function connect(address) {
  return run('adb', ['connect', address]);
}

export async function installApk(serial, apkPath, { replace = true } = {}) {
  const args = ['-s', serial, 'install'];
  if (replace) args.push('-r');
  args.push(apkPath);
  return run('adb', args);
}

export async function readProperty(serial, property) {
  const result = await shell(serial, ['getprop', property]);
  return result.code === 0 ? result.stdout.trim() : '';
}

export async function readBattery(serial) {
  const result = await shell(serial, ['dumpsys', 'battery']);
  return result.code === 0 ? parseBattery(result.stdout) : null;
}

export async function readStorage(serial) {
  const result = await shell(serial, ['df', '-k', '/data']);
  return result.code === 0 ? parseStorage(result.stdout) : null;
}

export async function listUserPackages(serial) {
  const result = await shell(serial, ['pm', 'list', 'packages', '-3']);
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'Could not list applications.');
  return parsePackages(result.stdout);
}

export async function launchPackage(serial, packageName) {
  return shell(serial, ['monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
}

export async function captureScreenshot(serial, filePath) {
  assertCapturePath(filePath, 'screenshot');
  const result = await runBinary('adb', ['-s', serial, 'exec-out', 'screencap', '-p']);
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'Could not capture screenshot.');
  if (result.stdout.length === 0) throw new Error('The device returned an empty screenshot.');
  await writeFile(filePath, result.stdout);
  return { ok: true, bytes: result.stdout.length };
}
