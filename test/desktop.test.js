import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedRendererEvent, isTrustedRendererUrl } from '../src/desktop/security.js';

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
  assert.match(main, /trustedHandle\(/);
  assert.match(main, /isTrustedRendererUrl\(url, RENDERER_ENTRY\)/);
});

test('renderer trust accepts only the configured local entry and expected webContents', () => {
  const entry = join(process.cwd(), 'src', 'desktop', 'renderer', 'index.html');
  const trustedUrl = pathToFileURL(entry).href;

  assert.equal(isTrustedRendererUrl(trustedUrl, entry), true);
  assert.equal(isTrustedRendererUrl(`${trustedUrl}#home`, entry), true);
  assert.equal(isTrustedRendererUrl('https://example.com/', entry), false);
  assert.equal(isTrustedRendererUrl(pathToFileURL(join(process.cwd(), 'README.md')).href, entry), false);

  const trustedEvent = { senderFrame: { url: trustedUrl }, sender: { id: 42 } };
  assert.equal(isTrustedRendererEvent(trustedEvent, entry, 42), true);
  assert.equal(isTrustedRendererEvent(trustedEvent, entry, 7), false);
  assert.equal(isTrustedRendererEvent({ senderFrame: { url: 'https://example.com/' }, sender: { id: 42 } }, entry, 42), false);
});
