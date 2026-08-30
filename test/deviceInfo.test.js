import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBattery, parsePackages, parseStorage } from '../src/core/deviceInfo.js';

test('parseBattery normalizes Android dumpsys battery output', () => {
  const result = parseBattery(`Current Battery Service state:\n  AC powered: false\n  USB powered: true\n  status: 2\n  level: 45\n  scale: 100\n  temperature: 318\n  plugged: 2\n`);
  assert.equal(result.percentage, 45);
  assert.equal(result.statusLabel, 'Charging');
  assert.equal(result.temperatureC, 31.8);
});

test('parseStorage extracts byte totals from df -k', () => {
  const result = parseStorage(`Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/block/dm-40 115625304 48326548 67298756 42% /data/user/0\n`);
  assert.equal(result.usePercent, 42);
  assert.equal(result.totalBytes, 115625304 * 1024);
  assert.equal(result.availableBytes, 67298756 * 1024);
});

test('parsePackages deduplicates and sorts package identifiers', () => {
  assert.deepEqual(parsePackages('package:com.example.z\npackage:com.example.a\npackage:com.example.z\n'), ['com.example.a', 'com.example.z']);
});
