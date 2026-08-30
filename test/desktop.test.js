import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('desktop renderer keeps a strict local content security policy', async () => {
  const html = await readFile(new URL('../src/desktop/renderer/index.html', import.meta.url), 'utf8');
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
