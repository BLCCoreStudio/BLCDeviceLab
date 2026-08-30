import { run, spawnPersistentChecked, spawnProcess } from './command.js';
import { detectVirtualWorkspaceCapabilities } from './virtualWorkspace.js';

let cachedCapabilities;

export async function scrcpyVersion() {
  return run('scrcpy', ['--version']);
}

export async function scrcpyHelp() {
  return run('scrcpy', ['--help']);
}

export async function getScrcpyCapabilities({ refresh = false } = {}) {
  if (!refresh && cachedCapabilities) return cachedCapabilities;
  const result = await scrcpyHelp();
  const capabilities = result.code === 0
    ? detectVirtualWorkspaceCapabilities(`${result.stdout}\n${result.stderr}`)
    : { newDisplay: false, flexDisplay: false, startApp: false };
  cachedCapabilities = capabilities;
  return capabilities;
}

export function buildScrcpyArgs({
  serial,
  maxSize,
  maxFps,
  videoBitRate,
  noAudio = false,
  turnScreenOff = false,
  stayAwake = false,
  record,
  noPlayback = false,
  noControl = false,
  noWindow = false,
  newDisplay,
  flexDisplay = false,
  startApp,
} = {}) {
  const args = [];
  if (serial) args.push('--serial', serial);
  if (maxSize) args.push('--max-size', String(maxSize));
  if (maxFps) args.push('--max-fps', String(maxFps));
  if (videoBitRate) args.push('--video-bit-rate', String(videoBitRate));
  if (noAudio) args.push('--no-audio');
  if (turnScreenOff) args.push('--turn-screen-off');
  if (stayAwake) args.push('--stay-awake');
  if (record) args.push(`--record=${record}`);
  if (noPlayback) args.push('--no-playback');
  if (noControl) args.push('--no-control');
  if (noWindow) args.push('--no-window');
  if (newDisplay === true) args.push('--new-display');
  else if (typeof newDisplay === 'string' && newDisplay) args.push(`--new-display=${newDisplay}`);
  if (flexDisplay) args.push('--flex-display');
  if (startApp) args.push(`--start-app=${startApp}`);
  return args;
}

export async function launchScrcpy(options = {}) {
  const started = await spawnPersistentChecked('scrcpy', buildScrcpyArgs(options));
  return started.pid;
}

export function launchScrcpyProcess(options = {}) {
  return spawnProcess('scrcpy', buildScrcpyArgs(options));
}
