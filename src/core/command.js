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

export function runBinary(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options,
    });

    const stdout = [];
    let stderr = '';
    child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({
      code,
      signal,
      stdout: Buffer.concat(stdout),
      stderr,
    }));
  });
}

export function spawnProcess(command, args = [], options = {}) {
  return spawn(command, args, {
    stdio: 'ignore',
    windowsHide: true,
    ...options,
  });
}

export function spawnDetached(command, args = [], options = {}) {
  const child = spawnProcess(command, args, { detached: false, ...options });
  child.on('error', () => {});
  child.unref();
  return child.pid;
}

export function spawnPersistentChecked(command, args = [], options = {}) {
  const {
    startupTimeoutMs = 650,
    maxErrorBytes = 8192,
    ...spawnOptions
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
      ...spawnOptions,
    });

    let settled = false;
    let stderr = '';
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < maxErrorBytes) stderr += chunk.slice(0, maxErrorBytes - stderr.length);
    });

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    child.once('error', (error) => {
      finishReject(new Error(`Could not start ${command}: ${error.message}`));
    });

    child.once('exit', (code, signal) => {
      if (settled) return;
      const detail = stderr.trim();
      const suffix = signal ? `signal ${signal}` : `exit code ${code}`;
      finishReject(new Error(detail || `${command} closed during startup (${suffix}).`));
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.stderr?.unref?.();
      child.unref();
      resolve({ child, pid: child.pid });
    }, Math.max(50, Number(startupTimeoutMs) || 650));
  });
}
