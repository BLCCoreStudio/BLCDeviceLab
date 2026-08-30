import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnPersistentChecked } from '../src/core/command.js';

test('spawnPersistentChecked resolves only after a process survives startup', async () => {
  const { child, pid } = await spawnPersistentChecked(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 2000)'],
    { startupTimeoutMs: 100 },
  );
  assert.equal(typeof pid, 'number');
  assert.ok(pid > 0);
  child.kill();
});

test('spawnPersistentChecked rejects a missing executable instead of leaking an error event', async () => {
  await assert.rejects(
    spawnPersistentChecked('blc-command-that-does-not-exist-7f39c5', [], { startupTimeoutMs: 100 }),
    /Could not start blc-command-that-does-not-exist-7f39c5/,
  );
});

test('spawnPersistentChecked surfaces stderr when a process dies during startup', async () => {
  await assert.rejects(
    spawnPersistentChecked(
      process.execPath,
      ['-e', 'process.stderr.write("startup boom"); process.exit(3)'],
      { startupTimeoutMs: 250 },
    ),
    /startup boom/,
  );
});
