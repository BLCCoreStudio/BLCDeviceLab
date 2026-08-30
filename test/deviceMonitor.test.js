import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceMonitor, diffDevices, planReconnects } from '../src/core/deviceMonitor.js';

test('diffDevices reports connect, disconnect and state transitions', () => {
  const previous = [
    { serial: 'usb-1', state: 'device', metadata: {} },
    { serial: '192.168.1.20:40000', state: 'offline', metadata: {} },
  ];
  const next = [
    { serial: '192.168.1.20:40000', state: 'device', metadata: {} },
    { serial: 'usb-2', state: 'unauthorized', metadata: {} },
  ];
  assert.deepEqual(diffDevices(previous, next), [
    { type: 'state', serial: '192.168.1.20:40000', from: 'offline', to: 'device' },
    { type: 'connected', serial: 'usb-2', state: 'unauthorized' },
    { type: 'disconnected', serial: 'usb-1', state: 'device' },
  ]);
});

test('planReconnects only retries missing endpoints after cooldown', () => {
  const attempts = new Map([
    ['192.168.1.20:40000', 90_000],
    ['192.168.1.30:40000', 70_000],
  ]);
  const devices = [
    { serial: '192.168.1.40:40000', state: 'device', metadata: {} },
    { serial: '192.168.1.50:40000', state: 'unauthorized', metadata: {} },
  ];
  assert.deepEqual(
    planReconnects(
      ['192.168.1.20:40000', '192.168.1.30:40000', '192.168.1.40:40000', '192.168.1.50:40000'],
      devices,
      attempts,
      100_000,
      15_000,
    ),
    ['192.168.1.30:40000'],
  );
});

test('DeviceMonitor emits only meaningful changes after initial scan', async () => {
  const scans = [
    [{ serial: 'usb-1', state: 'device', metadata: { model: 'Phone' } }],
    [{ serial: 'usb-1', state: 'device', metadata: { model: 'Phone' } }],
    [{ serial: 'usb-1', state: 'offline', metadata: { model: 'Phone' } }],
  ];
  const updates = [];
  const monitor = new DeviceMonitor({
    scan: async () => scans.shift() || [],
    onUpdate: async (payload) => updates.push(payload),
    now: () => 0,
  });
  await monitor.poll();
  await monitor.poll();
  await monitor.poll();
  assert.equal(updates.length, 2);
  assert.equal(updates[0].initial, true);
  assert.deepEqual(updates[1].changes, [{ type: 'state', serial: 'usb-1', from: 'device', to: 'offline' }]);
});
