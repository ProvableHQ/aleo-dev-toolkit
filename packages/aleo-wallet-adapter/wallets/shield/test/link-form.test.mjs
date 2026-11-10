import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWakeUrl, linkParams } from '../src/relay/linkForm.ts';

// channelIdOf and wakeUrlFor are thin wrappers over these vendored helpers.
const channelIdOf = url => linkParams(new URL(url)).get('channelId') ?? undefined;

test('reads the channel from the part each link form uses', () => {
  assert.equal(channelIdOf('shield://connect?channelId=c1&v=1'), 'c1');
  assert.equal(channelIdOf('https://connect.shield.app/connect#channelId=c1&v=1'), 'c1');
  assert.equal(channelIdOf('https://connect.shield.app/connect?channelId=c1'), undefined);
});

for (const [base, expected] of [
  ['shield://connect', 'shield://wake?channelId=c1'],
  ['https://connect.shield.app/connect', 'https://connect.shield.app/wake#channelId=c1'],
  [
    'https://connect.shield.app/preview/connect',
    'https://connect.shield.app/preview/wake#channelId=c1',
  ],
  ['https://connect.shield.app/dev/connect', 'https://connect.shield.app/dev/wake#channelId=c1'],
]) {
  test(`derives the wake link for ${base}`, () => {
    assert.equal(buildWakeUrl(base, 'c1'), expected);
  });
}

test('has no wake route for an https base not ending in /connect', () => {
  assert.equal(buildWakeUrl('https://connect.shield.app/pair', 'c1'), undefined);
});
