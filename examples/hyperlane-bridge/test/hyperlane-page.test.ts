import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { WalletContext } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalContext } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Network } from '@provablehq/aleo-types';
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
  supported: string[] | (() => Promise<string[]>) = [
    'route-bound-commitment-secret',
    'program-freezelist-exclusion-proof',
  ],
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) =>
    new Response(
      JSON.stringify(String(url).includes('/bridge_pause/') ? null : '0u128'),
    )) as typeof fetch;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let context = {
    wallet: { adapter: {} },
    address: 'aleo1accountA',
    connected: true,
    network: Network.TESTNET,
    supportsAddressEncoding: true,
    algorithmsSupported: typeof supported === 'function' ? supported : async () => supported,
    requestAddressEncoding: async () => ({ commitmentHex: '01'.repeat(32) }),
  };
  async function render(patch = {}) {
    context = { ...context, ...patch };
    await act(async () =>
      root.render(
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
    );
  }
  await render();
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  });
  return {
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
test('a mainnet wallet cannot fund the testnet bridge', async t => {
  const h = await mount(t);
  await h.render({ network: Network.MAINNET });
  await h.click('Request an encoding');
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
});
test('a fully granted compatible wallet enables the complete flow, and disconnect revokes it', async t => {
  const h = await mount(t);
  assert.match(h.text(), /Wallet ready for private claims and burns/);
  await h.click('Request an encoding');
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, false);
  assert.equal(h.button('Refresh balance').disabled, false);
  assert.equal(h.button('Review claim in wallet').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, false);
  await h.render({ connected: false });
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  assert.equal(h.button('Review claim in wallet').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, true);
});
test('reconnection rechecks the new wallet capabilities', async t => {
  const h = await mount(t);
  await h.click('Request an encoding');
  await h.render({ connected: false, algorithmsSupported: async () => [] });
  await h.render({ connected: true });
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, true);
});
test('a capability response arriving after disconnect cannot enable a deposit', async t => {
  let resolve!: (supported: string[]) => void;
  const pending = new Promise<string[]>(done => {
    resolve = done;
  });
  const h = await mount(t, () => pending);
  await h.render({ connected: false });
  await act(async () =>
    resolve(['route-bound-commitment-secret', 'program-freezelist-exclusion-proof']),
  );
  assert.equal(h.button('Connect Sepolia wallet & quote').disabled, true);
  assert.equal(h.button('Quote private burn').disabled, true);
});
