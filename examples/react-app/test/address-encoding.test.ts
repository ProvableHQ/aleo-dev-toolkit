import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { WalletContext } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalContext } from '@provablehq/aleo-wallet-adapter-react-ui';
import { Network } from '@provablehq/aleo-types';

// Keep example UI lifecycle tests outside the published-package release gate.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dapp.test' });
// The sibling example uses Vite JSX injection; tsx needs its classic runtime here.
Object.assign(globalThis, {
  React,
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { HyperlaneRecipient } = await import(
  '../src/components/functions/HyperlaneRecipient'
);
const encoding = 'ab'.repeat(32);
const deferred = () => {
  let resolve!: (value: { commitmentHex: string }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ commitmentHex: string }>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

async function mount(t: test.TestContext) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let context = {
    wallet: { adapter: {} },
    address: 'aleo1accountA',
    connected: true,
    network: Network.TESTNET,
    supportsAddressEncoding: true,
    requestAddressEncoding: async () => ({ commitmentHex: encoding }),
  };
  const render = async (patch = {}) => {
    context = { ...context, ...patch };
    await act(async () =>
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            WalletContext.Provider,
            { value: context as never },
            React.createElement(
              WalletModalContext.Provider,
              { value: { visible: false, setVisible: () => {} } },
              React.createElement(HyperlaneRecipient),
            ),
          ),
        ),
      ),
    );
  };
  await render();
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  return {
    render,
    output: () => container.querySelector('output')?.textContent,
    text: () => container.textContent!,
    button: () =>
      [...container.querySelectorAll('button')].find(b => /^Request/.test(b.textContent!))!,
    click: async () => {
      await act(async () =>
        [...container.querySelectorAll('button')]
          .find(b => /^Request/.test(b.textContent!))!
          .click(),
      );
    },
  };
}

for (const [name, patch] of [
  ['account', { address: 'aleo1accountB' }],
  ['network', { network: Network.MAINNET }],
  ['adapter', { wallet: { adapter: {} } }],
  ['disconnect', { connected: false }],
  ['capability', { supportsAddressEncoding: false }],
] as const) {
  test(`the minimal example hides its encoding when ${name} changes`, async t => {
    const h = await mount(t);
    await h.click();
    assert.equal(h.output(), `0x${encoding}`);
    await h.render(patch);
    assert.equal(h.output(), undefined);
  });
}

test('returning to the original account cannot restore a completed or pending encoding', async t => {
  const h = await mount(t);
  await h.click();
  await h.render({ address: 'aleo1accountB' });
  await h.render({ address: 'aleo1accountA' });
  assert.equal(h.output(), undefined);
  const old = deferred();
  await h.render({ requestAddressEncoding: () => old.promise });
  await h.click();
  await h.render({ address: 'aleo1accountB' });
  await h.render({ address: 'aleo1accountA' });
  await act(async () => old.resolve({ commitmentHex: encoding }));
  assert.equal(h.output(), undefined);
  assert.equal(h.button().disabled, false);
});

test('a stale completion cannot overwrite a newer encoding or its loading state', async t => {
  const h = await mount(t);
  const old = deferred(),
    current = deferred();
  await h.render({ requestAddressEncoding: () => old.promise });
  await h.click();
  await h.render({ address: 'aleo1accountB', requestAddressEncoding: () => current.promise });
  await h.click();
  await act(async () => old.reject(new Error('stale wallet error')));
  assert.equal(h.button().disabled, true);
  assert.ok(!h.text().includes('stale wallet error'));
  await act(async () => current.resolve({ commitmentHex: 'cd'.repeat(32) }));
  assert.equal(h.output(), `0x${'cd'.repeat(32)}`);
});

test('a same-context failure permits retry with a fresh encoding', async t => {
  const h = await mount(t);
  let attempts = 0;
  await h.render({
    requestAddressEncoding: async () => {
      if (++attempts === 1) throw new Error('Wallet refused');
      return { commitmentHex: encoding };
    },
  });
  await h.click();
  assert.ok(h.text().includes('Wallet refused'));
  assert.equal(h.button().disabled, false);
  await h.click();
  assert.equal(h.output(), `0x${encoding}`);
  assert.ok(!h.text().includes('Wallet refused'));
});
