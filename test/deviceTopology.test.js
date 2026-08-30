import test from 'node:test';
import assert from 'node:assert/strict';
import { collapseDevices, hardwareSerialFromMdns, transportType } from '../src/core/deviceTopology.js';

const metadata = { product: 'RMX3311TR', model: 'RMX3311', device: 'RE58B2L1' };

test('hardwareSerialFromMdns extracts the adb hardware serial including duplicate service names', () => {
  assert.equal(hardwareSerialFromMdns('adb-d9a39502-YtXTMK._adb-tls-connect._tcp'), 'd9a39502');
  assert.equal(hardwareSerialFromMdns('adb-d9a39502-YtXTMK (2)._adb-tls-connect._tcp'), 'd9a39502');
});

test('transportType distinguishes usb direct wifi and mdns wifi', () => {
  assert.equal(transportType('d9a39502', { usb: '4-1.3' }), 'usb');
  assert.equal(transportType('192.168.1.122:42701', metadata), 'wifi');
  assert.equal(transportType('adb-d9a39502-YtXTMK._adb-tls-connect._tcp', metadata), 'wifi-mdns');
});

test('collapseDevices represents usb direct wifi and mdns aliases as one physical device', () => {
  const devices = collapseDevices([
    { serial: 'd9a39502', state: 'device', metadata: { ...metadata, usb: '4-1.3', transport_id: '1' }, raw: 'usb' },
    { serial: '192.168.1.122:42701', state: 'device', metadata: { ...metadata, transport_id: '2' }, raw: 'wifi' },
    { serial: 'adb-d9a39502-YtXTMK (2)._adb-tls-connect._tcp', state: 'offline', metadata: { ...metadata, transport_id: '3' }, raw: 'mdns duplicate' },
    { serial: 'adb-d9a39502-YtXTMK._adb-tls-connect._tcp', state: 'device', metadata: { ...metadata, transport_id: '4' }, raw: 'mdns' },
  ]);

  assert.equal(devices.length, 1);
  assert.equal(devices[0].identity, 'd9a39502');
  assert.equal(devices[0].serial, 'd9a39502');
  assert.equal(devices[0].state, 'device');
  assert.deepEqual(
    new Set(devices[0].transports.map((transport) => transport.type)),
    new Set(['usb', 'wifi', 'wifi-mdns']),
  );
  assert.equal(devices[0].transports.length, 4);
});

test('collapseDevices prefers direct wifi after usb disappears', () => {
  const devices = collapseDevices([
    { serial: '192.168.1.122:42701', state: 'device', metadata: { ...metadata, transport_id: '2' }, raw: 'wifi' },
    { serial: 'adb-d9a39502-YtXTMK (2)._adb-tls-connect._tcp', state: 'offline', metadata: { ...metadata, transport_id: '3' }, raw: 'mdns duplicate' },
    { serial: 'adb-d9a39502-YtXTMK._adb-tls-connect._tcp', state: 'device', metadata: { ...metadata, transport_id: '4' }, raw: 'mdns' },
  ]);

  assert.equal(devices.length, 1);
  assert.equal(devices[0].serial, '192.168.1.122:42701');
  assert.equal(devices[0].state, 'device');
});

test('collapseDevices does not merge ambiguous identical-model phones without a physical anchor', () => {
  const devices = collapseDevices([
    { serial: 'USB-A', state: 'device', metadata: { model: 'SamePhone', usb: '1-1' }, raw: 'a' },
    { serial: 'USB-B', state: 'device', metadata: { model: 'SamePhone', usb: '1-2' }, raw: 'b' },
    { serial: '192.168.1.10:40000', state: 'device', metadata: { model: 'SamePhone' }, raw: 'wifi' },
  ]);
  assert.equal(devices.length, 3);
});
