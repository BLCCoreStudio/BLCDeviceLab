import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getProfile } from './profiles.js';
import { normalizeSerial } from '../shared/validation.js';

export const DEFAULT_WORKSPACE_SESSION = Object.freeze({
  version: 1,
  preferredSerial: null,
  preferredProfile: 'balanced',
  updatedAt: null,
});

function optionalSerial(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return normalizeSerial(value);
}

function profileId(value) {
  const id = String(value ?? 'balanced');
  return getProfile(id).id;
}

export function normalizeWorkspaceSession(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  let preferredSerial = null;
  let preferredProfile = 'balanced';
  try { preferredSerial = optionalSerial(input.preferredSerial); } catch {}
  try { preferredProfile = profileId(input.preferredProfile); } catch {}
  const updatedAt = typeof input.updatedAt === 'string' && !Number.isNaN(Date.parse(input.updatedAt))
    ? new Date(input.updatedAt).toISOString()
    : null;
  return { version: 1, preferredSerial, preferredProfile, updatedAt };
}

export async function readWorkspaceSession(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return normalizeWorkspaceSession(JSON.parse(content));
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return { ...DEFAULT_WORKSPACE_SESSION };
    throw error;
  }
}

export async function writeWorkspaceSession(filePath, patch = {}, now = new Date()) {
  const current = await readWorkspaceSession(filePath);
  const updates = {};
  if (patch && typeof patch === 'object') {
    if (Object.hasOwn(patch, 'preferredSerial') && patch.preferredSerial !== undefined) updates.preferredSerial = patch.preferredSerial;
    if (Object.hasOwn(patch, 'preferredProfile') && patch.preferredProfile !== undefined) updates.preferredProfile = patch.preferredProfile;
  }
  const next = normalizeWorkspaceSession({
    ...current,
    ...updates,
    updatedAt: now.toISOString(),
  });
  await mkdir(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(temporary, filePath);
  return next;
}
