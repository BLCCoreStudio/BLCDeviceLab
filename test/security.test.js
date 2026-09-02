import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedRendererEvent, isTrustedRendererUrl } from '../src/desktop/security.js';

test('desktop main routes IPC and navigation through the renderer trust boundary', async () => {
  const main = await readFile(new URL('../src/desktop/main.js', import.meta.url), 'utf8');
  assert.match(main, /trustedHandle\(/);
  assert.match(main, /assertTrustedRendererEvent\(/);
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
