import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('desktop renderer keeps a strict local content security policy', async () => {
  const html = await readFile(new URL('../src/desktop/renderer/index.html', import.meta.url), 'utf8');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /connect-src 'none'/);
});

test('preload exposes a narrow API instead of raw ipcRenderer', async () => {
  const preload = await readFile(new URL('../src/desktop/preload.js', import.meta.url), 'utf8');
  assert.match(preload, /contextBridge\.exposeInMainWorld\('blcDeviceLab'/);
  assert.doesNotMatch(preload, /exposeInMainWorld\([^\n]+ipcRenderer\s*[,) ]/);
});
