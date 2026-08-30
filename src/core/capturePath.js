import { extname } from 'node:path';

export function assertCapturePath(filePath, kind) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('A capture output path is required.');
  const extension = extname(filePath).toLowerCase();
  if (kind === 'screenshot' && extension !== '.png') {
    throw new Error('Screenshots must be saved as PNG files.');
  }
  if (kind === 'recording' && !['.mp4', '.mkv'].includes(extension)) {
    throw new Error('Recordings must be saved as MP4 or MKV files.');
  }
  if (!['screenshot', 'recording'].includes(kind)) throw new Error('Unknown capture type.');
  return filePath;
}
