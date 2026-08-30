import test from 'node:test';
import assert from 'node:assert/strict';
import { getProfile, listProfiles } from '../src/core/profiles.js';
import { buildScrcpyArgs } from '../src/core/scrcpy.js';

test('profiles expose only known public ids', () => {
  assert.deepEqual(listProfiles().map((profile) => profile.id), ['balanced', 'latency', 'quality']);
  assert.throws(() => getProfile('custom-shell-flags'), /Unknown mirror profile/);
});

test('balanced profile maps to constrained scrcpy options', () => {
  const args = buildScrcpyArgs({ serial: 'device-1', ...getProfile('balanced').options });
  assert.deepEqual(args, [
    '--serial', 'device-1',
    '--max-size', '1920',
    '--max-fps', '60',
    '--video-bit-rate', '8M',
    '--stay-awake',
  ]);
});
