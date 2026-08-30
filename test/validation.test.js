import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAddress, normalizePairCode, normalizeSerial } from '../src/shared/validation.js';

test('normalizeAddress accepts common wireless debugging addresses', () => {
  assert.equal(normalizeAddress('192.168.1.20:37123'), '192.168.1.20:37123');
  assert.equal(normalizeAddress('adb-device.local:42837'), 'adb-device.local:42837');
  assert.equal(normalizeAddress('[fe80::1]:5555'), '[fe80::1]:5555');
});

test('normalizeAddress rejects missing or invalid ports', () => {
  assert.throws(() => normalizeAddress('192.168.1.20'), /valid host and port/);
  assert.throws(() => normalizeAddress('192.168.1.20:70000'), /between 1 and 65535/);
});

test('pair codes and serials are constrained before reaching process calls', () => {
  assert.equal(normalizePairCode('037893'), '037893');
  assert.throws(() => normalizePairCode('37893'), /6 digits/);
  assert.equal(normalizeSerial('192.168.1.118:42837'), '192.168.1.118:42837');
  assert.throws(() => normalizeSerial('device; rm -rf /'), /Invalid device identifier/);
});

import { normalizePackageName } from '../src/shared/validation.js';

test('package names are validated before application launch', () => {
  assert.equal(normalizePackageName('com.example.editor'), 'com.example.editor');
  assert.throws(() => normalizePackageName('com.example.editor;id'), /Invalid application package/);
  assert.throws(() => normalizePackageName('singleword'), /Invalid application package/);
});
