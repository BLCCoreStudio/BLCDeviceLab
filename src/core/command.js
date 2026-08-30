import { spawn } from 'node:child_process';

export function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options,
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

export function spawnDetached(command, args = [], options = {}) {
  const child = spawn(command, args, {
    detached: false,
    stdio: 'ignore',
    windowsHide: true,
    ...options,
  });
  child.unref();
  return child.pid;
}
