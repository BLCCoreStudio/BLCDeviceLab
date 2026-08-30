import { run } from './command.js';

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
