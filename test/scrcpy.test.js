import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScrcpyArgs } from '../src/core/scrcpy.js';

test('buildScrcpyArgs only emits requested options', () => {
  assert.deepEqual(buildScrcpyArgs({
    serial: 'abc',
    maxSize: 1920,
    maxFps: 60,
    videoBitRate: '12M',
    turnScreenOff: true,
    stayAwake: true,
  }), [
    '--serial', 'abc',
    '--max-size', '1920',
    '--max-fps', '60',
    '--video-bit-rate', '12M',
    '--turn-screen-off',
    '--stay-awake',
  ]);
});
