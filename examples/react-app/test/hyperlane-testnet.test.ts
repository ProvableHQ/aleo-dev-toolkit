import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { encodeFunctionResult, zeroAddress, type EIP1193Provider, type Hex } from 'viem';
import { HYP_NATIVE_ABI, quoteTestnetMint, sendTestnetMint } from '../src/lib/hyperlaneTestnet';

const account = '0x1111111111111111111111111111111111111111';
const recipient = `0x${Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join('')}`;
const input = {
  recipient,
  amountEth: '0.001',
};
const hash = `0x${'12'.repeat(32)}` as Hex;
const principal = 1_000_000_000_000_000n;
const word = (value: bigint) => value.toString(16).padStart(64, '0');

function fixture() {
  const state = {
    chain: 11155111,
    account,
    fee: 69_000_000_000_001n,
    token: zeroAddress as string,
    rejectSimulation: false,
    afterSimulation: () => {},
    pauseQuote: undefined as Promise<void> | undefined,
    send: async () => hash,
  };
  const calls: { method: string; params?: unknown }[] = [];
  const provider = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      calls.push({ method, params });
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [state.account];
        case 'eth_chainId':
          return `0x${state.chain.toString(16)}`;
        case 'wallet_switchEthereumChain':
          state.chain = 11155111;
          return null;
        case 'eth_call': {
          const transaction = params?.[0] as { data: string; value?: string };
          if (transaction.data.startsWith('0x81b4e8b4')) {
            if (state.rejectSimulation) throw new Error('transferRemote reverted');
            state.afterSimulation();
            return encodeFunctionResult({
              abi: HYP_NATIVE_ABI,
              functionName: 'transferRemote',
              result: hash,
            });
          }
          await state.pauseQuote;
          return encodeFunctionResult({
            abi: HYP_NATIVE_ABI,
            functionName: 'quoteTransferRemote',
            result: [
              { token: zeroAddress, amount: state.fee },
              { token: zeroAddress, amount: principal },
              { token: state.token as Hex, amount: 0n },
            ],
          });
        }
        case 'eth_sendTransaction':
          return state.send();
        default:
          throw new Error(`Unexpected RPC method ${method}`);
      }
    },
  } as unknown as EIP1193Provider;
  return {
    provider,
    state,
    calls,
    sent: () => calls.filter(call => call.method === 'eth_sendTransaction'),
  };
}

test('quotes principal plus all native fees without double-counting the bridged ETH', async () => {
  const { provider, state } = fixture();
  const quote = await quoteTestnetMint(provider, input);
  assert.equal(quote.amount, principal);
  assert.equal(quote.fee, state.fee);
  assert.equal(quote.value, principal + state.fee);
  assert.equal(quote.recipient, recipient);
});

test('switches from mainnet to Sepolia before quoting', async () => {
  const { provider, state, calls } = fixture();
  state.chain = 1;
  await quoteTestnetMint(provider, input);
  const change = calls.findIndex(call => call.method === 'wallet_switchEthereumChain');
  const read = calls.findIndex(call => call.method === 'eth_call');
  assert.ok(change >= 0 && change < read);
  assert.deepEqual(calls[change].params, [{ chainId: '0xaa36a7' }]);
});

test('sends the exact second-input bytes, testnet domain and wei amount, after simulation', async () => {
  const h = fixture();
  const quote = await quoteTestnetMint(h.provider, input);
  assert.equal(await sendTestnetMint(h.provider, quote), hash);
  assert.equal(h.sent().length, 1);
  const [transaction] = h.sent()[0].params as [
    { to: string; data: string; value: Hex; from: string },
  ];
  assert.equal(transaction.to.toLowerCase(), '0x7c4aaaab1f846881af95f5736d127f3f3f07f25f');
  assert.equal(transaction.from.toLowerCase(), account);
  assert.equal(
    transaction.data,
    `0x81b4e8b4${word(1617853565n)}${recipient.slice(2)}${word(principal)}`,
  );
  assert.equal(BigInt(transaction.value), principal + h.state.fee);
  const simulation = h.calls.findIndex(
    call =>
      call.method === 'eth_call' &&
      (call.params as [{ data: string }])[0].data.startsWith('0x81b4e8b4'),
  );
  assert.ok(
    simulation >= 0 &&
      simulation < h.calls.findIndex(call => call.method === 'eth_sendTransaction'),
  );
});

test('rejects missing or malformed bytes32 recipients before contacting a wallet', async () => {
  for (const invalid of ['', recipient.slice(2), '0x12', `0x${'gg'.repeat(32)}`]) {
    const h = fixture();
    await assert.rejects(quoteTestnetMint(h.provider, { ...input, recipient: invalid }), /32-byte/);
    assert.equal(h.calls.length, 0);
  }
});

test('rejects zero, negative and over-precision ETH amounts instead of rounding', async () => {
  for (const amountEth of ['0', '-1', '1e-3', '0.0000000000000000001', 'NaN']) {
    const h = fixture();
    await assert.rejects(quoteTestnetMint(h.provider, { ...input, amountEth }));
    assert.equal(h.calls.length, 0);
  }
});

for (const [name, change, message] of [
  [
    'network',
    (s: ReturnType<typeof fixture>['state']) => {
      s.chain = 1;
    },
    /Sepolia/,
  ],
  [
    'account',
    (s: ReturnType<typeof fixture>['state']) => {
      s.account = '0x2222222222222222222222222222222222222222';
    },
    /account changed/,
  ],
  [
    'fee',
    (s: ReturnType<typeof fixture>['state']) => {
      s.fee += 1n;
    },
    /fee changed/,
  ],
] as const) {
  test(`does not send after the ${name} changes`, async () => {
    const h = fixture();
    const quote = await quoteTestnetMint(h.provider, input);
    change(h.state);
    await assert.rejects(sendTestnetMint(h.provider, quote), message);
    assert.equal(h.sent().length, 0);
  });
}

test('does not send when simulation reverts', async () => {
  const h = fixture();
  const quote = await quoteTestnetMint(h.provider, input);
  h.state.rejectSimulation = true;
  await assert.rejects(sendTestnetMint(h.provider, quote), /transferRemote reverted/);
  assert.equal(h.sent().length, 0);
});

test('does not send if the Aleo encoding changes during simulation', async () => {
  const h = fixture();
  const quote = await quoteTestnetMint(h.provider, input);
  let current = true;
  h.state.afterSimulation = () => {
    current = false;
  };
  await assert.rejects(
    sendTestnetMint(h.provider, quote, () => {
      if (!current) throw new Error('Recipient changed');
    }),
    /Recipient changed/,
  );
  assert.equal(h.sent().length, 0);
});

test('rejects a route requiring non-native fee tokens', async () => {
  const h = fixture();
  h.state.token = '0x3333333333333333333333333333333333333333';
  await assert.rejects(quoteTestnetMint(h.provider, input), /native Sepolia ETH/);
  assert.equal(h.sent().length, 0);
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dapp.test' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { HyperlaneTestnetMint } = await import('../src/components/functions/HyperlaneTestnetMint');

async function mount(t: test.TestContext, provider?: EIP1193Provider) {
  Object.assign(window, { ethereum: provider });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = async (issuedRecipient = recipient) => {
    await act(async () =>
      root.render(React.createElement(HyperlaneTestnetMint, { issuedRecipient })),
    );
  };
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  await render();
  return {
    render,
    input: () => container.querySelector<HTMLInputElement>('#mint-recipient')!,
    quote: () =>
      [...container.querySelectorAll('button')].find(button =>
        /Connect Sepolia|Working/.test(button.textContent ?? ''),
      )!,
    send: () =>
      [...container.querySelectorAll('button')].find(
        button => button.textContent === 'Send Sepolia ETH',
      ),
    text: () => container.textContent!,
    click: async (button: HTMLButtonElement) => {
      await act(async () => button.click());
    },
  };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test('the form shows the exact recipient and ETH value before offering a send', async t => {
  const evm = fixture();
  const h = await mount(t, evm.provider);
  assert.equal(h.input().value, recipient);
  await h.click(h.quote());
  assert.ok(h.send());
  assert.ok(h.text().includes(recipient));
  assert.ok(h.text().includes('0.001069000000000001 ETH'));
  assert.equal(evm.sent().length, 0);
});

test('the form reports a missing EVM wallet without attempting a transfer', async t => {
  const h = await mount(t);
  await h.click(h.quote());
  assert.ok(h.text().includes('Install an EVM wallet'));
  assert.equal(h.send(), undefined);
});

test('a changed wallet encoding discards a pending quote and keeps the next recipient', async t => {
  const evm = fixture();
  const gate = deferred();
  evm.state.pauseQuote = gate.promise;
  const h = await mount(t, evm.provider);
  await h.click(h.quote());
  const next = `0x${'cd'.repeat(32)}`;
  await h.render(next);
  assert.equal(h.quote().disabled, true);
  await act(async () => gate.resolve());
  assert.equal(h.input().value, next);
  assert.equal(h.quote().disabled, false);
  assert.equal(h.send(), undefined);
  assert.equal(evm.sent().length, 0);
});

test('duplicate clicks and a new encoding cannot open a second pending wallet submission', async t => {
  const evm = fixture();
  const prompt = deferred();
  evm.state.send = async () => {
    await prompt.promise;
    return hash;
  };
  const h = await mount(t, evm.provider);
  await h.click(h.quote());
  const button = h.send()!;
  await act(async () => {
    button.click();
    button.click();
  });
  assert.equal(evm.sent().length, 1);
  await h.render(`0x${'ef'.repeat(32)}`);
  assert.equal(h.quote().disabled, true);
  await act(async () => prompt.reject(new Error('User rejected the transaction')));
  assert.equal(evm.sent().length, 1);
  assert.equal(h.quote().disabled, false);
  assert.equal(h.send(), undefined);
  assert.ok(h.text().includes('User rejected'));
});
