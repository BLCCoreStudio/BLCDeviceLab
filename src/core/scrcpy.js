import { run, spawnDetached } from './command.js';

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
} = {}) {
  const args = [];
  if (serial) args.push('--serial', serial);
  if (maxSize) args.push('--max-size', String(maxSize));
  if (maxFps) args.push('--max-fps', String(maxFps));
  if (videoBitRate) args.push('--video-bit-rate', String(videoBitRate));
  if (noAudio) args.push('--no-audio');
  if (turnScreenOff) args.push('--turn-screen-off');
  if (stayAwake) args.push('--stay-awake');
  return args;
}

export function launchScrcpy(options = {}) {
  return spawnDetached('scrcpy', buildScrcpyArgs(options));
}
