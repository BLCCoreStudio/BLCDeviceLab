import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScrcpyArgs } from '../src/core/scrcpy.js';
import {
  canLaunchVirtualWorkspace,
  detectVirtualWorkspaceCapabilities,
  getVirtualWorkspacePreset,
  listVirtualWorkspacePresets,
} from '../src/core/virtualWorkspace.js';

test('virtual workspace capability detection is based on actual scrcpy help flags', () => {
  const capabilities = detectVirtualWorkspaceCapabilities(`
    --new-display[=WxH/DPI]
    --flex-display
    --start-app=PACKAGE
  `);
  assert.deepEqual(capabilities, { newDisplay: true, flexDisplay: true, startApp: true });
  assert.deepEqual(detectVirtualWorkspaceCapabilities('--start-app=PACKAGE'), {
    newDisplay: false,
    flexDisplay: false,
    startApp: true,
  });
});

test('virtual workspace exposes only constrained product presets', () => {
  assert.deepEqual(listVirtualWorkspacePresets().map((preset) => preset.id), ['responsive', 'desktop', 'tablet']);
  assert.throws(() => getVirtualWorkspacePreset('custom-shell-flags'), /Unknown virtual workspace preset/);
});

test('responsive preset requires flex display support while fixed presets do not', () => {
  const base = { newDisplay: true, startApp: true, flexDisplay: false };
  assert.equal(canLaunchVirtualWorkspace(base, getVirtualWorkspacePreset('responsive')), false);
  assert.equal(canLaunchVirtualWorkspace(base, getVirtualWorkspacePreset('desktop')), true);
});

test('virtual workspace scrcpy arguments stay structured and explicit', () => {
  const args = buildScrcpyArgs({
    serial: 'device-1',
    newDisplay: '1920x1080/240',
    startApp: 'com.example.editor',
    flexDisplay: true,
    videoBitRate: '12M',
    maxFps: 60,
  });
  assert.deepEqual(args, [
    '--serial', 'device-1',
    '--max-fps', '60',
    '--video-bit-rate', '12M',
    '--new-display=1920x1080/240',
    '--flex-display',
    '--start-app=com.example.editor',
  ]);
});
