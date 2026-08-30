import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rendererUrl = new URL('../src/desktop/renderer/index.html', import.meta.url);
const appUrl = new URL('../src/desktop/renderer/app.js', import.meta.url);
const viewsCssUrl = new URL('../src/desktop/renderer/views.css', import.meta.url);

async function rendererFiles() {
  const [html, renderer] = await Promise.all([
    readFile(rendererUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  return { html, renderer };
}

test('desktop renderer keeps a strict local content security policy', async () => {
  const html = await readFile(rendererUrl, 'utf8');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /connect-src 'none'/);
});

test('sandboxed preload uses Electron-compatible CommonJS and exposes only the narrow bridge', async () => {
  const preload = await readFile(new URL('../src/desktop/preload.js', import.meta.url), 'utf8');
  assert.match(preload, /require\(['"]electron['"]\)/);
  assert.doesNotMatch(preload, /^\s*import\s/m);
  assert.match(preload, /contextBridge\.exposeInMainWorld\('blcDeviceLab'/);
  assert.doesNotMatch(preload, /exposeInMainWorld\([^\n]+ipcRenderer\s*[,) ]/);
});

test('desktop keeps renderer sandbox and context isolation enabled', async () => {
  const main = await readFile(new URL('../src/desktop/main.js', import.meta.url), 'utf8');
  assert.match(main, /preload:\s*join\(__dirname, 'preload\.js'\)/);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
});

test('sidebar has six unique product views instead of shared scroll targets', async () => {
  const { html, renderer } = await rendererFiles();
  const expected = ['home', 'workspace', 'apps', 'capture', 'wireless', 'doctor'];
  const navViews = [...html.matchAll(/class="nav-button[^"]*"[^>]*data-view="([^"]+)"/g)].map((match) => match[1]);
  const panelViews = [...html.matchAll(/data-view-panel="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(navViews, expected);
  assert.deepEqual(panelViews, expected);
  assert.equal(new Set(navViews).size, expected.length);
  assert.doesNotMatch(html, /data-target=/);
  assert.match(renderer, /function showView\(viewName\)/);
  assert.match(renderer, /panel\.classList\.toggle\('hidden', !active\)/);
  assert.doesNotMatch(renderer, /scrollIntoView/);
});

test('home shortcuts only open real existing product views', async () => {
  const { html } = await rendererFiles();
  const panels = new Set([...html.matchAll(/data-view-panel="([^"]+)"/g)].map((match) => match[1]));
  const shortcuts = [...html.matchAll(/data-open-view="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(shortcuts.length >= 5);
  for (const target of shortcuts) assert.ok(panels.has(target), `Missing view panel for shortcut ${target}`);
});

test('renderer HTML contains no duplicate ids and app selectors resolve to real controls', async () => {
  const { html, renderer } = await rendererFiles();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'renderer contains duplicate id attributes');

  const idSet = new Set(ids);
  const selectors = [...renderer.matchAll(/querySelector\(['"]#([A-Za-z0-9_-]+)['"]\)/g)].map((match) => match[1]);
  for (const id of selectors) assert.ok(idSet.has(id), `Renderer queries missing #${id}`);
});

test('connection badge distinguishes connected, warning and disconnected states', async () => {
  const { html, renderer } = await rendererFiles();
  assert.match(html, /connection-badge disconnected/);
  assert.match(html, /data-state="disconnected"/);
  assert.match(renderer, /state = 'connected'/);
  assert.match(renderer, /state = 'warning'/);
  assert.match(renderer, /state = 'disconnected'/);
  assert.match(renderer, /device needs attention/);
  assert.match(renderer, /devices need attention/);
});

test('connection and doctor status tones exist in the loaded view stylesheet', async () => {
  const [html, css] = await Promise.all([
    readFile(rendererUrl, 'utf8'),
    readFile(viewsCssUrl, 'utf8'),
  ]);
  assert.match(html, /href="views\.css"/);
  assert.match(css, /\.connection-badge\.connected\s*\{/);
  assert.match(css, /\.connection-badge\.warning\s*\{/);
  assert.match(css, /\.connection-badge\.disconnected\s*\{/);
  assert.match(css, /\.health\.warn\s*\{/);
});

test('Device Doctor treats no device as a warning state, not a failed tool probe', async () => {
  const { renderer } = await rendererFiles();
  assert.match(renderer, /'NO DEVICE'/);
  assert.match(renderer, /doctorCard\('Connected device',[\s\S]*'warn'\)/);
  assert.match(renderer, /doctorCard\('ADB bridge', diagnostics\.adb\)/);
  assert.match(renderer, /doctorCard\('scrcpy engine', diagnostics\.scrcpy\)/);
});

test('main dashboard exposes only implemented areas and keeps virtual workspace integration', async () => {
  const { html } = await rendererFiles();
  assert.doesNotMatch(html, /Where the product goes next/);
  assert.doesNotMatch(html, /Continuity Engine/);
  assert.doesNotMatch(html, /Repro Capsule/);
  assert.doesNotMatch(html, /Device Twin/);
  assert.match(html, /src="virtual-workspace\.js"/);
  assert.match(html, /id="pairButton"/);
  assert.match(html, /id="connectButton"/);
  assert.match(html, /id="loadAppsButton"/);
  assert.match(html, /id="screenshotButton"/);
  assert.match(html, /id="recordButton"/);
});
