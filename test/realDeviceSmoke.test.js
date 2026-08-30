import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPngSignature, selectReadyDevice } from '../scripts/real-device-smoke.js';

test('selectReadyDevice chooses the only ready device', () => {
  const selected = selectReadyDevice([
    { serial: 'offline-1', state: 'offline' },
    { serial: 'ready-1', state: 'device' },
  ]);
  assert.equal(selected.serial, 'ready-1');
});

test('selectReadyDevice requires an explicit serial when several devices are ready', () => {
  const devices = [
    { serial: 'device-a', state: 'device' },
    { serial: 'device-b', state: 'device' },
  ];
  assert.throws(() => selectReadyDevice(devices), /More than one ready device/);
  assert.equal(selectReadyDevice(devices, 'device-b').serial, 'device-b');
});

test('selectReadyDevice rejects a requested unauthorized device', () => {
  assert.throws(
    () => selectReadyDevice([{ serial: 'phone', state: 'unauthorized' }], 'phone'),
    /unauthorized, not ready/,
  );
});

test('hasPngSignature recognizes the PNG magic bytes', () => {
  assert.equal(hasPngSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])), true);
  assert.equal(hasPngSignature(Buffer.from('not-a-png')), false);
});
