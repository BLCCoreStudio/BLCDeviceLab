import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretConnectResult, interpretPairResult } from '../src/core/adbOutcome.js';

test('wireless connect requires an explicit adb success message', () => {
  assert.equal(interpretConnectResult({ code: 0, stdout: 'connected to 192.168.1.20:42837\n' }).ok, true);
  assert.equal(interpretConnectResult({ code: 0, stdout: 'already connected to 192.168.1.20:42837\n' }).ok, true);
  assert.equal(interpretConnectResult({ code: 0, stderr: 'failed to connect to 192.168.1.20:42837\n' }).ok, false);
  assert.equal(interpretConnectResult({ code: 0, stdout: 'mystery response\n' }).ok, false);
});

test('wireless pairing requires adb confirmation', () => {
  assert.equal(interpretPairResult({ code: 0, stdout: 'Successfully paired to 192.168.1.20:37123 [guid=abc]\n' }).ok, true);
  assert.equal(interpretPairResult({ code: 1, stderr: 'Failed: Unable to start pairing client.\n' }).ok, false);
  assert.equal(interpretPairResult({ code: 0, stdout: '' }).ok, false);
});
