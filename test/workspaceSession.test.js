import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_WORKSPACE_SESSION,
  normalizeWorkspaceSession,
  readWorkspaceSession,
  writeWorkspaceSession,
} from '../src/core/workspaceSession.js';

test('workspace session sanitizes stale and unknown values', () => {
  assert.deepEqual(normalizeWorkspaceSession({
    preferredSerial: 'device;rm -rf /',
    preferredProfile: 'ultra-secret',
    unknown: 'ignored',
  }), DEFAULT_WORKSPACE_SESSION);
});

test('workspace session persists only validated product preferences', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'blc-session-'));
  const path = join(dir, 'workspace.json');
  const saved = await writeWorkspaceSession(path, {
    preferredSerial: '192.168.1.118:42837',
    preferredProfile: 'latency',
    arbitraryCommand: 'adb shell id',
  }, new Date('2026-08-30T18:00:00.000Z'));
  assert.equal(saved.preferredSerial, '192.168.1.118:42837');
  assert.equal(saved.preferredProfile, 'latency');
  assert.equal(saved.updatedAt, '2026-08-30T18:00:00.000Z');
  assert.equal(Object.hasOwn(saved, 'arbitraryCommand'), false);
  assert.deepEqual(await readWorkspaceSession(path), saved);
  assert.equal((await readFile(path, 'utf8')).includes('arbitraryCommand'), false);
});

test('workspace session falls back safely when JSON is corrupted', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'blc-session-bad-'));
  const path = join(dir, 'workspace.json');
  await writeFile(path, '{bad json', 'utf8');
  assert.deepEqual(await readWorkspaceSession(path), DEFAULT_WORKSPACE_SESSION);
});

test('partial workspace updates preserve the other preference', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'blc-session-partial-'));
  const path = join(dir, 'workspace.json');
  await writeWorkspaceSession(path, { preferredSerial: 'usb-1', preferredProfile: 'quality' }, new Date('2026-08-30T18:00:00.000Z'));
  const saved = await writeWorkspaceSession(path, { preferredSerial: 'usb-2' }, new Date('2026-08-30T18:01:00.000Z'));
  assert.equal(saved.preferredSerial, 'usb-2');
  assert.equal(saved.preferredProfile, 'quality');
});
