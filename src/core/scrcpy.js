import { run, spawnDetached, spawnProcess } from './command.js';

export async function scrcpyVersion() {
  return run('scrcpy', ['--version']);
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
  return args;
}

export function launchScrcpy(options = {}) {
  return spawnDetached('scrcpy', buildScrcpyArgs(options));
}

export function launchScrcpyProcess(options = {}) {
  return spawnProcess('scrcpy', buildScrcpyArgs(options));
}
