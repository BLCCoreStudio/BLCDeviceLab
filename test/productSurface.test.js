import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const htmlPath = new URL('../src/desktop/renderer/index.html', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);
const bootstrapPath = new URL('../src/desktop/bootstrap.js', import.meta.url);
const iconPath = new URL('../src/desktop/assets/app-icon.png', import.meta.url);

const requiredSurfaceIds = [
  'home',
  'devices',
  'capture',
  'apps',
  'connect',
  'doctor',
  'deviceGrid',
  'captureDeviceSelect',
  'appDeviceSelect',
  'pairButton',
  'connectButton',
  'doctorGrid',
];

test('desktop surface exposes only implemented product areas', async () => {
  const html = await readFile(htmlPath, 'utf8');
  for (const id of requiredSurfaceIds) assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.doesNotMatch(html, /Where the product goes next/i);
  assert.doesNotMatch(html, /\bPLANNED\b/i);
  assert.doesNotMatch(html, /COMING SOON/i);
  assert.doesNotMatch(html, /Connection:\s*Live/i);
  assert.match(html, /No device connected/i);
});

test('electron starts through the branded desktop bootstrap', async () => {
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const bootstrap = await readFile(bootstrapPath, 'utf8');
  assert.equal(pkg.main, 'src/desktop/bootstrap.js');
  assert.match(pkg.scripts.desktop, /desktop:prepare/);
  assert.match(bootstrap, /setDesktopName\('blc-device-lab\.desktop'\)/);
  assert.match(bootstrap, /appendSwitch\('class', 'blc-device-lab'\)/);
});

test('bundled app icon is a square PNG large enough for desktop chrome', async () => {
  const bytes = await readFile(iconPath);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(width, height);
  assert.ok(width >= 64, `expected at least 64px icon, got ${width}px`);
});
