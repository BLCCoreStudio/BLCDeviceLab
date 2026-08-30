import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDevices } from '../src/core/adb.js';

test('parseDevices parses multiple adb device states and metadata', () => {
  const output = `List of devices attached\nR58M123456 device product:foo model:Galaxy_S24 device:e1q transport_id:1\n192.168.1.10:5555 offline product:bar model:Pixel_9 transport_id:2\n`;
  assert.deepEqual(parseDevices(output), [
    {
      serial: 'R58M123456',
      state: 'device',
      metadata: { product: 'foo', model: 'Galaxy_S24', device: 'e1q', transport_id: '1' },
      raw: 'R58M123456 device product:foo model:Galaxy_S24 device:e1q transport_id:1',
    },
    {
      serial: '192.168.1.10:5555',
      state: 'offline',
      metadata: { product: 'bar', model: 'Pixel_9', transport_id: '2' },
      raw: '192.168.1.10:5555 offline product:bar model:Pixel_9 transport_id:2',
    },
  ]);
});

test('parseDevices returns empty array for unexpected output', () => {
  assert.deepEqual(parseDevices('adb server version mismatch'), []);
});
