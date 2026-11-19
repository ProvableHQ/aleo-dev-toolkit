/* global globalThis */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { WalletContext } from '../dist/index.mjs';

// Exercise the actual example component while replacing its visual primitives.
// The package already supplies React, React DOM, jsdom and the workspace compiler.
const require = createRequire(import.meta.url);
const virtual = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const ui = virtual(`
  export const Button='button', Input='input', Label='label', Alert='aside', AlertDescription='p';
  export const CodePanel=()=>null;
  export const codeExamples={hyperlaneRecipient:''};
`);
const modules = {
  react: pathToFileURL(require.resolve('react')).href,
  'react/jsx-runtime': pathToFileURL(require.resolve('react/jsx-runtime')).href,
  '@provablehq/aleo-types': pathToFileURL(require.resolve('@provablehq/aleo-types')).href,
  '@provablehq/aleo-wallet-adapter-react': new URL('../dist/index.mjs', import.meta.url).href,
  '@provablehq/aleo-wallet-adapter-react-ui': virtual(
    'export const useWalletModal=()=>({setVisible:()=>{}});',
  ),
};
const source = await readFile(
  new URL(
    '../../../../examples/react-app/src/components/functions/HyperlaneRecipient.tsx',
    import.meta.url,
  ),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const compiled = outputText.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, id) => {
  const target = modules[id] ?? (id.startsWith('@/') ? ui : undefined);
  assert.ok(target, `unmapped example import: ${id}`);
  return `from ${JSON.stringify(target)}`;
});
const { HyperlaneRecipient } = await import(virtual(compiled));
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://dapp.test',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const hex = 'ab'.repeat(32);

async function mount(t, requestAddressEncoding = async () => ({ commitmentHex: hex })) {
  let context = {
    wallet: { adapter: {} },
    address: 'aleo1accountA',
    network: 'testnet',
    connected: true,
    supportsAddressEncoding: true,
    requestAddressEncoding,
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = async (patch = {}) => {
    context = { ...context, ...patch };
    await act(async () =>
      root.render(
        React.createElement(
          WalletContext.Provider,
          { value: context },
          React.createElement(HyperlaneRecipient),
        ),
      ),
    );
  };
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  await render();
  return {
    render,
    input: () => container.querySelector('input'),
    button: () => container.querySelector('button'),
    text: () => container.textContent,
    click: async () => {
      await act(async () => container.querySelector('button').click());
    },
  };
}

test('shows the issued encoding for the current wallet', async t => {
  let request;
  const h = await mount(t, async value => {
    request = value;
    return { commitmentHex: hex };
  });
  await h.click();
  assert.deepEqual(request, { network: 'testnet' });
  assert.equal(h.input().value, `0x${hex}`);
});
for (const [name, patch] of [
  ['account', { address: 'aleo1accountB' }],
  ['network', { network: 'mainnet' }],
  ['adapter', { wallet: { adapter: {} } }],
  ['connection', { connected: false }],
  ['capability', { supportsAddressEncoding: false }],
]) {
  test(`hides the issued encoding after a ${name} change`, async t => {
    const h = await mount(t);
    await h.click();
    assert.ok(h.input());
    await h.render(patch);
    assert.equal(h.input(), null);
  });
}
test('returning to an earlier account does not restore its old result', async t => {
  const h = await mount(t);
  await h.click();
  await h.render({ address: 'aleo1accountB' });
  await h.render({ address: 'aleo1accountA' });
  assert.equal(h.input(), null);
});
test('ignores an old response after switching away and back', async t => {
  const old = deferred();
  const h = await mount(t, () => old.promise);
  await h.click();
  await h.render({ address: 'aleo1accountB' });
  await h.render({ address: 'aleo1accountA' });
  await act(async () => old.resolve({ commitmentHex: hex }));
  assert.equal(h.input(), null);
  assert.equal(h.button().disabled, false);
});
for (const rejected of [false, true]) {
  test(`an old ${rejected ? 'failure' : 'response'} cannot finish a new network's request`, async t => {
    const old = deferred(),
      next = deferred();
    const h = await mount(t, request =>
      request.network === 'testnet' ? old.promise : next.promise,
    );
    await h.click();
    assert.equal(h.button().disabled, true);
    await h.render({ network: 'mainnet' });
    assert.equal(h.button().disabled, false);
    await h.click();
    await act(async () =>
      rejected ? old.reject(new Error('old failure')) : old.resolve({ commitmentHex: hex }),
    );
    assert.equal(h.input(), null);
    assert.equal(h.button().disabled, true);
    assert.ok(!h.text().includes('old failure'));
    const nextHex = 'cd'.repeat(32);
    await act(async () => next.resolve({ commitmentHex: nextHex }));
    assert.equal(h.input().value, `0x${nextHex}`);
    assert.equal(h.button().disabled, false);
  });
}
