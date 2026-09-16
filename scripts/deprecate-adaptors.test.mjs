import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./deprecate-adaptors.mjs', import.meta.url));

function run(t, args, scenario = '') {
  const dir = mkdtempSync(join(tmpdir(), 'adapter-deprecation-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, 'calls.jsonl');
  writeFileSync(log, '');
  // All npm commands are intercepted; these tests never contact a registry.
  writeFileSync(
    join(dir, 'npm'),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'view') {
  if (process.env.SCENARIO === 'missing' && args[1].includes('aleo-hooks@')) process.exit(1);
  console.log(JSON.stringify(process.env.SCENARIO === 'wrong-version' ? '0.0.0' : args[1].split('@').pop()));
} else if (args[0] === 'deprecate' && process.env.SCENARIO === 'write-failure') process.exit(1);
`,
    { mode: 0o755 },
  );
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CALL_LOG: log, SCENARIO: scenario },
  });
  const calls = readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  return { ...result, calls };
}

test('default and explicit preview make no registry calls', t => {
  for (const args of [[], ['--dry-run']]) {
    const result = run(t, args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.calls.length, 0);
    assert.equal(result.stdout.match(/npm "deprecate"/g).length, 8);
  }
});

test('invalid or conflicting options cannot trigger deprecation', t => {
  for (const args of [['--execut'], ['--execute', '--dry-run']]) {
    const result = run(t, args);
    assert.equal(result.status, 1);
    assert.equal(result.calls.length, 0);
  }
});

test('missing dependency release prevents every deprecation, even when adapters exist', t => {
  const result = run(t, ['--execute'], 'missing');
  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 11);
  assert.ok(result.calls.every(call => call[0] === 'view'));
});

test('unexpected registry version prevents deprecation', t => {
  const result = run(t, ['--execute'], 'wrong-version');
  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 1);
  assert.match(result.stderr, /is not published/);
});

test('verifies the entire release before deprecating all eight old names', t => {
  const result = run(t, ['--execute']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 19);
  assert.ok(result.calls.slice(0, 11).every(call => call[0] === 'view'));
  const writes = result.calls.slice(11);
  assert.equal(new Set(writes.map(call => call[1])).size, 8);
  for (const [command, spec, message, registry] of writes) {
    assert.equal(command, 'deprecate');
    assert.match(spec, /^@provablehq\/aleo-wallet-adaptor-.*@\*$/);
    assert.ok(message.includes(spec.replace('adaptor', 'adapter').replace('@*', '')));
    assert.match(message, /migrating-to-adapter\.md/);
    assert.equal(registry, '--registry=https://registry.npmjs.org/');
  }
});

test('stops and reports a failed deprecation instead of claiming success', t => {
  const result = run(t, ['--execute'], 'write-failure');
  assert.equal(result.status, 1);
  assert.equal(result.calls.filter(call => call[0] === 'deprecate').length, 1);
  assert.match(result.stderr, /npm deprecate failed/);
});
