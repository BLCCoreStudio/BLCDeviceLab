import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const MAX_HISTORY = 100;

export async function readCaptureHistory(historyPath) {
  try {
    const parsed = JSON.parse(await readFile(historyPath, 'utf8'));
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return [];
    throw error;
  }
}

export async function upsertCaptureHistory(historyPath, entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id) throw new Error('Capture history entry requires an id.');
  const history = await readCaptureHistory(historyPath);
  const next = [entry, ...history.filter((item) => item?.id !== entry.id)].slice(0, MAX_HISTORY);
  await mkdir(dirname(historyPath), { recursive: true });
  const temporaryPath = `${historyPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, historyPath);
  return next;
}
