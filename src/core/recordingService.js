import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { assertCapturePath } from './capturePath.js';
import { getProfile } from './profiles.js';
import { launchScrcpyProcess } from './scrcpy.js';

const recordings = new Map();
const events = new EventEmitter();
const MAX_ERROR_BYTES = 8192;

function publicRecording(recording) {
  const { child, ...publicFields } = recording;
  return { ...publicFields };
}

export function listActiveRecordings() {
  return [...recordings.values()].map(publicRecording);
}

export function onRecordingEnded(listener) {
  events.on('ended', listener);
  return () => events.off('ended', listener);
}

export function createRecordingEndWaiter(id, timeoutMs = 5000, eventBus = events) {
  let settled = false;
  let timer;

  const cleanup = () => {
    eventBus.off('ended', handler);
    if (timer) clearTimeout(timer);
  };

  const handler = (result) => {
    if (result.id !== id || settled) return;
    settled = true;
    cleanup();
    resolvePromise(result);
  };

  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  eventBus.on('ended', handler);
  timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectPromise(new Error('Recording is still finalizing. Try again in a moment.'));
  }, timeoutMs);
  timer.unref?.();

  return {
    promise,
    cancel() {
      if (settled) return;
      settled = true;
      cleanup();
    },
  };
}

export function buildRecordingScrcpyOptions({ serial, filePath, profileId = 'balanced', withPlayback = true }) {
  assertCapturePath(filePath, 'recording');
  const profile = getProfile(profileId);
  return {
    serial,
    ...profile.options,
    // scrcpy rejects --stay-awake together with --no-control.
    stayAwake: withPlayback ? Boolean(profile.options.stayAwake) : false,
    record: filePath,
    noPlayback: !withPlayback,
    noControl: !withPlayback,
    noWindow: !withPlayback,
  };
}

export function startRecording({ serial, filePath, profileId = 'balanced', withPlayback = true }) {
  if ([...recordings.values()].some((recording) => recording.serial === serial)) {
    throw new Error('This device already has an active recording.');
  }

  const options = buildRecordingScrcpyOptions({ serial, filePath, profileId, withPlayback });
  const profile = getProfile(profileId);
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const child = launchScrcpyProcess(options, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk) => {
    if (stderr.length < MAX_ERROR_BYTES) stderr += chunk.slice(0, MAX_ERROR_BYTES - stderr.length);
  });

  const recording = {
    id,
    serial,
    filePath,
    profileId: profile.id,
    withPlayback,
    startedAt,
    status: 'recording',
    pid: child.pid,
    child,
  };
  recordings.set(id, recording);

  child.once('exit', (code, signal) => {
    if (!recordings.has(id)) return;
    recordings.delete(id);
    const completed = code === 0 || signal === 'SIGINT';
    const ended = {
      ...publicRecording(recording),
      status: completed ? 'completed' : 'ended',
      endedAt: new Date().toISOString(),
      exitCode: code,
      signal,
      ...(completed || !stderr.trim() ? {} : { error: stderr.trim() }),
    };
    events.emit('ended', ended);
  });

  child.once('error', (error) => {
    if (!recordings.has(id)) return;
    recordings.delete(id);
    events.emit('ended', {
      ...publicRecording(recording),
      status: 'failed',
      endedAt: new Date().toISOString(),
      error: error.message,
    });
  });

  return publicRecording(recording);
}

export async function stopRecording(id) {
  const recording = recordings.get(id);
  if (!recording) throw new Error('That recording is no longer active.');

  const waiter = createRecordingEndWaiter(id);
  const signaled = recording.child.kill('SIGINT');
  if (!signaled) {
    waiter.cancel();
    throw new Error('Could not stop the recording process.');
  }

  return waiter.promise;
}
