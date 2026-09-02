import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function isTrustedRendererUrl(value, entryPath) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'file:') return false;
    parsed.hash = '';
    parsed.search = '';
    return resolve(fileURLToPath(parsed)) === resolve(entryPath);
  } catch {
    return false;
  }
}

export function isTrustedRendererEvent(event, entryPath, expectedWebContentsId) {
  if (!isTrustedRendererUrl(event?.senderFrame?.url, entryPath)) return false;
  if (expectedWebContentsId === undefined || expectedWebContentsId === null) return true;
  return event?.sender?.id === expectedWebContentsId;
}

export function assertTrustedRendererEvent(event, entryPath, expectedWebContentsId) {
  if (!isTrustedRendererEvent(event, entryPath, expectedWebContentsId)) {
    throw new Error('Blocked IPC request from an untrusted renderer frame.');
  }
}
