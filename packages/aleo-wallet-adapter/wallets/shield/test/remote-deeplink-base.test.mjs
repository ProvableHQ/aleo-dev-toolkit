import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHIELD_DEEPLINK_BASE,
  SHIELD_VERIFIED_DEEPLINK_BASE,
  ShieldWalletAdapter,
} from '../dist/index.mjs';

const withBase = deeplinkBase => () => new ShieldWalletAdapter({ remote: { deeplinkBase } });

test('keeps the custom scheme as the default until installs register the verified link', () => {
  assert.equal(DEFAULT_SHIELD_DEEPLINK_BASE, 'shield://connect');
  assert.doesNotThrow(() => new ShieldWalletAdapter());
});

test('accepts the verified https link and its per-variant paths', () => {
  assert.equal(SHIELD_VERIFIED_DEEPLINK_BASE, 'https://connect.shield.app/connect');
  assert.doesNotThrow(withBase(SHIELD_VERIFIED_DEEPLINK_BASE));
  assert.doesNotThrow(withBase('https://connect.shield.app/preview/connect'));
  assert.doesNotThrow(withBase('shield-dev://connect'));
});

test('refuses a plain http base, which can never be a verified link', () => {
  assert.throws(withBase('http://connect.shield.app/connect'), /must be https/);
});

test('refuses a base that is not a URL', () => {
  assert.throws(withBase('connect.shield.app/connect'), /invalid deeplinkBase/);
});
