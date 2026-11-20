import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createStore, Provider } from 'jotai';
import { WalletContext } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalContext } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Network } from '@provablehq/aleo-types';
import {
  HYPERLANE_GRANTS,
  HYPERLANE_PROGRAMS,
  HYPERLANE_RECORD_ACCESS,
} from '../src/lib/hyperlaneAleoTestnet';
import {
  algorithmsAllowedAtom,
  programsAtom,
  readAddressAtom,
  recordAccessAtom,
} from '../src/lib/store/global';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dapp.test' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { HyperlaneRecipientPage } = await import('../src/pages/HyperlaneRecipientPage');
async function mount(
  t: test.TestContext,
  supported = ['hyperlane-claim-secret', 'program-freezelist-exclusion-proof'],
  granted = true,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) =>
    new Response(
      JSON.stringify(String(url).includes('/bridge_pause/') ? null : '0u128'),
    )) as typeof fetch;
  const store = createStore();
  store.set(programsAtom, HYPERLANE_PROGRAMS);
  store.set(readAddressAtom, true);
  store.set(recordAccessAtom, HYPERLANE_RECORD_ACCESS);
  store.set(algorithmsAllowedAtom, granted ? HYPERLANE_GRANTS : []);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let context = {
    wallet: { adapter: {} },
    address: 'aleo1accountA',
    connected: true,
    network: Network.TESTNET,
    supportsAddressEncoding: true,
    algorithmsSupported: async () => supported,
    requestAddressEncoding: async () => ({ commitmentHex: '01'.repeat(32) }),
    disconnect: async () => {
      context = { ...context, connected: false };
      await render();
    },
  };
  async function render(patch = {}) {
    context = { ...context, ...patch };
    await act(async () =>
      root.render(
        React.createElement(
          Provider,
          { store },
          React.createElement(
            WalletContext.Provider,
            { value: context as never },
            React.createElement(
              WalletModalContext.Provider,
              { value: { visible: false, setVisible: () => {} } },
              React.createElement(HyperlaneRecipientPage),
            ),
          ),
        ),
      ),
    );
  }
  await render();
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  });
  return {
    store,
    render,
    text: () => container.textContent!,
    button: (text: string) =>
      [...container.querySelectorAll('button')].find(b => b.textContent === text)!,
    click: async (text: string) => {
      await act(async () =>
        [...container.querySelectorAll('button')].find(b => b.textContent === text)!.click(),
      );
    },
  };
}
test('an encoding-capable wallet with no claim algorithm cannot fund a deposit', async t => {
  const h = await mount(t, ['program-freezelist-exclusion-proof']);
  await h.click('Request an encoding');
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  assert.ok(!h.text().includes('Wallet ready for private claims and burns.'));
});
test('capabilities alone cannot bypass connection grants', async t => {
  const h = await mount(t, undefined, false);
  await h.click('Request an encoding');
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
});
test('a fully granted compatible wallet enables the complete flow, and disconnect revokes it', async t => {
  const h = await mount(t);
  assert.match(h.text(), /Wallet ready for private claims and burns/);
  await h.click('Request an encoding');
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, false);
  assert.equal(h.button('Check delivered claimable balance').disabled, false);
  assert.equal(h.button('Approve private claim').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, false);
  await h.render({ connected: false });
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  assert.equal(h.button('Approve private claim').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, true);
});
test('changing connection settings invalidates approval until reconnection', async t => {
  const h = await mount(t);
  await h.click('Request an encoding');
  await act(async () => h.store.set(programsAtom, [...HYPERLANE_PROGRAMS, 'other.aleo']));
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  await h.render({ connected: false });
  await h.render({ connected: true });
  assert.match(h.text(), /Wallet ready for private claims and burns/);
});
test('configuration disconnects the previous session and saves bounded grants', async t => {
  const h = await mount(t, undefined, false);
  await h.click('Configure Hyperlane testnet permissions');
  assert.deepEqual(h.store.get(algorithmsAllowedAtom), HYPERLANE_GRANTS);
  assert.equal(h.button('Approve private claim').disabled, true);
  await h.render({ connected: true });
  assert.match(h.text(), /Wallet ready for private claims and burns/);
});
