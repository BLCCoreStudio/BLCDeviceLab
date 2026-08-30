import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCaptureHistory, upsertCaptureHistory } from '../src/core/captureHistory.js';
import { assertCapturePath } from '../src/core/capturePath.js';
import { buildScrcpyArgs } from '../src/core/scrcpy.js';

test('capture paths are constrained by artifact type', () => {
  assert.equal(assertCapturePath('/tmp/shot.png', 'screenshot'), '/tmp/shot.png');
  assert.equal(assertCapturePath('/tmp/demo.mp4', 'recording'), '/tmp/demo.mp4');
  assert.equal(assertCapturePath('/tmp/demo.mkv', 'recording'), '/tmp/demo.mkv');
  assert.throws(() => assertCapturePath('/tmp/shot.jpg', 'screenshot'), /PNG/);
  assert.throws(() => assertCapturePath('/tmp/demo.exe', 'recording'), /MP4 or MKV/);
});

test('recording arguments use scrcpy record mode without shell strings', () => {
  assert.deepEqual(buildScrcpyArgs({
    serial: 'device-1',
    record: '/tmp/demo.mp4',
    noPlayback: true,
    noControl: true,
    noWindow: true,
  }), [
    '--serial', 'device-1',
    '--record=/tmp/demo.mp4',
    '--no-playback',
    '--no-control',
    '--no-window',
  ]);
});

test('capture history is local, bounded and upserts by id', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'blc-capture-'));
  const path = join(dir, 'history.json');
  assert.deepEqual(await readCaptureHistory(path), []);
  await upsertCaptureHistory(path, { id: 'one', type: 'screenshot', status: 'completed' });
  await upsertCaptureHistory(path, { id: 'one', type: 'screenshot', status: 'updated' });
  const history = await readCaptureHistory(path);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'updated');
  assert.match(await readFile(path, 'utf8'), /"id": "one"/);
});
