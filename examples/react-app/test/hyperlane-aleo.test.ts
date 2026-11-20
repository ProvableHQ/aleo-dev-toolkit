import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { WalletContext } from '@provablehq/aleo-wallet-adapter-react';
import type { TransactionOptions } from '@provablehq/aleo-types';
import {
  bytes32Limbs,
  commitmentHex,
  ethAmount,
  preparePrivateClaim,
  preparePrivateBurn,
  quotePrivateBurn,
  readClaimable,
  WARP,
  TOKEN,
  FREEZELIST,
  MAILBOX,
  HOOK_MANAGER,
  ZERO_ADDRESS,
  HYPERLANE_GRANTS,
  HYPERLANE_PROGRAMS,
  HYPERLANE_RECORD_ACCESS,
  type MappingReader,
} from '../src/lib/hyperlaneAleoTestnet';
import {
  hasHyperlanePermissions,
  withHyperlaneAlgorithms,
  withHyperlaneRecords,
  type HyperlaneGate,
} from '../src/lib/hyperlanePermissions';
const hook = 'aleo175xvd3uqmswt9ckt2d4drnxrqu8gzuzz3u3cjlt3cxhru74d2qqsnf5t46';
const merkle = 'aleo1k45pt4auhdr27hlep9pg47w82nn7vzt2g8tmcxc4gpas25fdrugsapnyvh';
const recipient = '0x1111111111111111111111111111111111111111';
const encoding = `0x${Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join('')}`;
const principal = 1000000000000000n;
function fixture() {
  const values = new Map<string, string | null>();
  const key = (p: string, m: string, k: string) => `${p}/${m}/${k}`;
  const set = (p: string, m: string, k: string, value: string | null) =>
    values.set(key(p, m, k), value);
  set(WARP, 'bridge_pause', 'true', '[false, false]');
  set(WARP, 'claimable', bytes32Limbs(encoding), `${principal}u128`);
  set(
    WARP,
    'app_metadata',
    'true',
    `{ token_type: 1u8, token_owner: ${hook}, ism: ${ZERO_ADDRESS}, hook: ${ZERO_ADDRESS}, token_id: 123field, local_decimals: 18u8, remote_decimals: 18u8 }`,
  );
  const routerBytes = `0000000000000000000000007c4aaaab1f846881af95f5736d127f3f3f07f25f`
    .match(/../g)!
    .map(b => `${parseInt(b, 16)}u8`)
    .join(', ');
  set(
    WARP,
    'remote_routers',
    '11155111u32',
    `{ domain: 11155111u32, recipient: [${routerBytes}], gas: 60000u128 }`,
  );
  set(
    MAILBOX,
    'mailbox',
    'true',
    `{ local_domain: 1617853565u32, nonce: 16u32, default_hook: ${hook}, required_hook: ${merkle} }`,
  );
  set(WARP, 'private_transfer_fee_bps__', 'false', '25u16');
  set(HOOK_MANAGER, 'hooks', hook, '4u8');
  set(HOOK_MANAGER, 'hooks', merkle, '3u8');
  set(
    HOOK_MANAGER,
    'destination_gas_configs',
    `{ igp: ${hook}, destination: 11155111u32 }`,
    '{ gas_overhead: 300000u128, exchange_rate: 246150u128, gas_price: 1000000u128 }',
  );
  const calls: string[] = [];
  const read: MappingReader = async (p, m, k) => {
    calls.push(key(p, m, k));
    if (!values.has(key(p, m, k))) throw new Error(`Unexpected mapping ${key(p, m, k)}`);
    return values.get(key(p, m, k))!;
  };
  return { values, set, read, calls };
}
test('commitment limbs preserve the original little-endian byte order', () => {
  assert.equal(
    bytes32Limbs(encoding),
    `[${0x0f0e0d0c0b0a09080706050403020100n}u128, ${0x1f1e1d1c1b1a19181716151413121110n}u128]`,
  );
  assert.equal(commitmentHex(encoding.toUpperCase().replace('0X', '0x')), encoding.slice(2));
  for (const invalid of ['', '0x12', 'gg'.repeat(32)]) assert.throws(() => bytes32Limbs(invalid));
  for (const invalid of ['0', '-1', '1e-3', '0.0000000000000000001', (1n << 128n).toString()])
    assert.throws(() => ethAmount(invalid));
});
test('private claim uses the exact five-input ABI and wallet-owned recipient, secret, and proof', async () => {
  const h = fixture();
  const tx = await preparePrivateClaim(encoding, '0.0005', '1000000', h.read);
  assert.equal(tx.program, WARP);
  assert.equal(tx.function, 'claim_private');
  assert.equal(tx.privateFee, false);
  assert.equal(tx.fee, 1000000);
  assert.deepEqual(tx.inputs, [
    bytes32Limbs(encoding),
    '500000000000000u128',
    { type: 'address' },
    {
      type: 'derived',
      algorithm: 'hyperlane-claim-secret',
      args: { commitment: { type: 'string', value: encoding.slice(2) } },
    },
    {
      type: 'derived',
      algorithm: 'program-freezelist-exclusion-proof',
      args: { freezelistProgram: { type: 'string', value: FREEZELIST } },
    },
  ]);
  await assert.rejects(preparePrivateClaim(encoding, '1', '1000000', h.read), /Claimable balance/);
  await assert.rejects(preparePrivateClaim(encoding, '0.001', '-1', h.read), /execution fee/);
  h.set(WARP, 'claimable', bytes32Limbs(encoding), null);
  assert.equal(await readClaimable(encoding, h.read), 0n);
  await assert.rejects(
    preparePrivateClaim(encoding, '0.001', '1000000', h.read),
    /Claimable balance/,
  );
});
test('private burn builds eleven ABI inputs, gross-record filters, signer proof, and actual dispatch fees', async () => {
  const h = fixture();
  const quote = await quotePrivateBurn(recipient, '0.001', h.read);
  assert.equal(quote.tokenFee, 2500000000000n);
  assert.equal(quote.net, 997500000000000n);
  assert.equal(quote.dispatchMicrocredits, 8861400n);
  assert.equal(quote.inputs.length, 11);
  assert.deepEqual(quote.inputs[0], {
    type: 'record',
    program: TOKEN,
    recordname: 'Token',
    filters: { amount: { gte: `${principal}u128` } },
  });
  assert.deepEqual(quote.inputs[1], {
    type: 'record',
    program: 'credits.aleo',
    recordname: 'credits',
    filters: { microcredits: { gte: '8861400u64' } },
  });
  assert.equal(quote.inputs[3], `{ default_hook: ${hook}, required_hook: ${merkle} }`);
  assert.equal(quote.inputs[5], '11155111u32');
  assert.equal(quote.inputs[6], bytes32Limbs(`0x${'0'.repeat(24)}${recipient.slice(2)}`));
  assert.equal(quote.inputs[7], `${principal}u128`);
  assert.ok(String(quote.inputs[8]).includes(`spender: ${hook}, amount: 8861400u64`));
  assert.deepEqual(quote.inputs[9], {
    type: 'derived',
    algorithm: 'program-freezelist-exclusion-proof',
    args: { freezelistProgram: { type: 'string', value: FREEZELIST } },
  });
  assert.equal(quote.inputs[10], '25u16');
  const tx = await preparePrivateBurn(quote, '1000000', h.read);
  assert.equal(tx.function, 'transfer_remote_private');
  assert.equal(tx.privateFee, false);
  assert.deepEqual(tx.inputs, quote.inputs);
  assert.ok(h.calls.includes(`${WARP}/private_transfer_fee_bps__/false`));
});
test('duplicate effective/required hooks need two payments but one allowance entry', async () => {
  const h = fixture();
  h.set(
    MAILBOX,
    'mailbox',
    'true',
    `{ local_domain: 1617853565u32, default_hook: ${hook}, required_hook: ${hook} }`,
  );
  const q = await quotePrivateBurn(recipient, '0.001', h.read);
  assert.equal(q.dispatchMicrocredits, 17722800n);
  assert.equal(String(q.inputs[8]).match(/8861400u64/g)?.length, 1);
});
test('uses contract zero-fee default only for a genuinely absent fee mapping value', async () => {
  const h = fixture();
  h.set(WARP, 'private_transfer_fee_bps__', 'false', null);
  assert.equal((await quotePrivateBurn(recipient, '0.001', h.read)).tokenFee, 0n);
  await assert.rejects(
    quotePrivateBurn(recipient, '0.001', async () => {
      throw new Error('node offline');
    }),
    /node offline/,
  );
});
test('private fee calculation floors the remainder without overflowing u128', async () => {
  const h = fixture();
  h.set(WARP, 'private_transfer_fee_bps__', 'false', '9999u16');
  const q = await quotePrivateBurn(recipient, '0.000000000000010001', h.read);
  assert.equal(q.tokenFee, 9999n);
  assert.equal(q.net, 2n);
});
for (const kind of ['claim', 'burn'] as const)
  test(`blocks paused ${kind} without creating a transaction`, async () => {
    const h = fixture();
    h.set(WARP, 'bridge_pause', 'true', kind === 'claim' ? '[true, false]' : '[false, true]');
    await assert.rejects(
      kind === 'claim'
        ? preparePrivateClaim(encoding, '0.001', '1000000', h.read)
        : quotePrivateBurn(recipient, '0.001', h.read),
      /paused/,
    );
  });
test('requires a new burn quote after token fees, gas config or route state change', async () => {
  for (const change of [
    (h: ReturnType<typeof fixture>) => h.set(WARP, 'private_transfer_fee_bps__', 'false', '26u16'),
    (h: ReturnType<typeof fixture>) =>
      h.set(
        HOOK_MANAGER,
        'destination_gas_configs',
        `{ igp: ${hook}, destination: 11155111u32 }`,
        '{ gas_overhead: 300001u128, exchange_rate: 246150u128, gas_price: 1000000u128 }',
      ),
    (h: ReturnType<typeof fixture>) =>
      h.set(
        WARP,
        'app_metadata',
        'true',
        h.values.get(`${WARP}/app_metadata/true`)!.replace('123field', '124field'),
      ),
  ]) {
    const h = fixture();
    const q = await quotePrivateBurn(recipient, '0.001', h.read);
    change(h);
    await assert.rejects(preparePrivateBurn(q, '1000000', h.read), /changed/);
  }
});
test('rejects malformed routes, unknown hooks, invalid fees and missing gas configurations', async () => {
  for (const change of [
    (h: ReturnType<typeof fixture>) => h.set(HOOK_MANAGER, 'hooks', hook, '5u8'),
    (h: ReturnType<typeof fixture>) =>
      h.set(WARP, 'private_transfer_fee_bps__', 'false', '10000u16'),
    (h: ReturnType<typeof fixture>) =>
      h.set(
        HOOK_MANAGER,
        'destination_gas_configs',
        `{ igp: ${hook}, destination: 11155111u32 }`,
        null,
      ),
    (h: ReturnType<typeof fixture>) =>
      h.set(WARP, 'remote_routers', '11155111u32', '{ domain: 1u32 }'),
  ]) {
    const h = fixture();
    change(h);
    await assert.rejects(quotePrivateBurn(recipient, '0.001', h.read));
  }
});
test('connection grants cover only the three derived slots and hidden record filter fields', () => {
  const algorithms = withHyperlaneAlgorithms([
    { ...HYPERLANE_GRANTS[1], argConstraints: { freezelistProgram: ['wrong.aleo'] } },
  ]);
  const records = withHyperlaneRecords({ level: 'none' });
  assert.deepEqual(algorithms, HYPERLANE_GRANTS);
  assert.deepEqual(records, HYPERLANE_RECORD_ACCESS);
  assert.ok(hasHyperlanePermissions(HYPERLANE_PROGRAMS, algorithms, records, true));
  assert.equal(
    hasHyperlanePermissions(HYPERLANE_PROGRAMS, algorithms.slice(1), records, true),
    false,
  );
  assert.equal(
    hasHyperlanePermissions(HYPERLANE_PROGRAMS, algorithms, { level: 'none' }, true),
    false,
  );
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dapp.test' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const { HyperlaneAleoActions } = await import('../src/components/functions/HyperlaneAleoActions');
async function changeInput(container: HTMLElement, selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
async function mount(
  t: test.TestContext,
  execute: (tx: TransactionOptions) => Promise<{ transactionId: string } | undefined>,
  read = fixture().read,
  mode: 'claim' | 'burn' = 'claim',
  initialClaimAmount = '0.001',
) {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const [, tail] = String(url).split('/program/');
    const [program, , mapping, rawKey] = tail.split('/');
    return {
      ok: true,
      json: async () => read(program, mapping, decodeURIComponent(rawKey)),
    } as Response;
  }) as typeof fetch;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const gate: HyperlaneGate = { ready: true, scope: {} };
  const adapter = {};
  let failTracking: ((error: Error) => void) | undefined;
  const render = async (nextGate = gate, issuedRecipient = encoding) => {
    await act(async () =>
      root.render(
        React.createElement(
          WalletContext.Provider,
          {
            value: {
              executeTransaction: execute,
              connected: true,
              network: 'testnet',
              wallet: { adapter },
              address: 'aleo1account',
              subscribeTransactionStatus: async (
                _id: string,
                _status: unknown,
                fail: (error: Error) => void,
              ) => {
                failTracking = fail;
                return () => {};
              },
            } as never,
          },
          React.createElement(HyperlaneAleoActions, {
            mode,
            gate: nextGate,
            issuedRecipient,
          }),
        ),
      ),
    );
  };
  await render();
  if (mode === 'claim' && initialClaimAmount)
    await changeInput(container, '#hyperlane-claim-amount', initialClaimAmount);
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = fetchOriginal;
  });
  return {
    render,
    container,
    amount: () => container.querySelector<HTMLInputElement>(`#hyperlane-${mode}-amount`)!,
    changeAmount: (value: string) => changeInput(container, `#hyperlane-${mode}-amount`, value),
    inspect: async () => {
      await act(async () =>
        [...container.querySelectorAll('button')]
          .find(b => b.textContent === 'Check delivered claimable balance')!
          .click(),
      );
    },
    failTracking: async () => {
      await act(async () => failTracking?.(new Error('status unavailable')));
    },
    button: () =>
      [...container.querySelectorAll('button')].find(
        b => b.textContent === 'Approve private claim',
      )!,
    text: () => container.textContent!,
    click: async () => {
      await act(async () => {
        const b = [...container.querySelectorAll('button')].find(
          b => b.textContent === 'Approve private claim',
        )!;
        b.click();
        b.click();
      });
    },
  };
}
test('duplicate claim clicks produce one wallet request and retain an untracked submission', async t => {
  const calls: TransactionOptions[] = [];
  const h = await mount(t, async tx => {
    calls.push(tx);
    return undefined;
  });
  await h.click();
  assert.equal(calls.length, 1);
  assert.equal(h.button().disabled, true);
  assert.match(h.text(), /No transaction handle/);
  assert.match(h.text(), /checked wallet activity/);
});
test('a wallet change while refreshing claim state prevents submission', async t => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  let calls = 0;
  const h = await mount(
    t,
    async () => {
      calls++;
      return { transactionId: 'id' };
    },
    async (...args) => {
      await pending;
      return fixture().read(...args);
    },
  );
  await h.click();
  await h.render({ ready: false, scope: {} });
  await act(async () => release());
  assert.equal(calls, 0);
  assert.equal(h.button().disabled, true);
});
test('a tracking error cannot automatically re-enable a previously submitted claim', async t => {
  let calls = 0;
  const h = await mount(t, async () => {
    calls++;
    return { transactionId: 'wallet-handle' };
  });
  await h.click();
  assert.equal(calls, 1);
  assert.match(h.text(), /wallet-handle/);
  await h.failTracking();
  assert.match(h.text(), /status unavailable/);
  assert.equal(h.button().disabled, true);
  await h.render({ ready: false, scope: {} });
  assert.match(h.text(), /original wallet account/);
  assert.match(h.text(), /wallet-handle/);
});

test('private burn form sends the reviewed eleven-input transaction only once', async t => {
  const calls: TransactionOptions[] = [];
  const h = await mount(
    t,
    async tx => {
      calls.push(tx);
      return { transactionId: 'burn-handle' };
    },
    fixture().read,
    'burn',
  );
  const input = h.container.querySelector<HTMLInputElement>('#hyperlane-burn-recipient')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      recipient,
    );
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  const button = (text: string) =>
    [...h.container.querySelectorAll('button')].find(b => b.textContent === text)!;
  assert.equal(button('Approve private burn').disabled, true);
  await act(async () => button('Quote private burn').click());
  assert.match(h.text(), /8861400 microcredits/);
  assert.match(h.text(), /0.0000025 ETH/);
  assert.equal(button('Approve private burn').disabled, false);
  await act(async () => {
    const b = button('Approve private burn');
    b.click();
    b.click();
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].function, 'transfer_remote_private');
  assert.equal(calls[0].inputs.length, 11);
  assert.deepEqual(calls[0].inputs[0], {
    type: 'record',
    program: TOKEN,
    recordname: 'Token',
    filters: { amount: { gte: '1000000000000000u128' } },
  });
  assert.equal(button('Approve private burn').disabled, true);
});

test('a newly issued encoding cancels an older claim still reading chain state', async t => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  let calls = 0;
  const h = await mount(
    t,
    async () => {
      calls++;
      return { transactionId: 'id' };
    },
    async (...args) => {
      await pending;
      return fixture().read(...args);
    },
  );
  await h.click();
  await h.render(undefined, `0x${'22'.repeat(32)}`);
  await act(async () => release());
  assert.equal(calls, 0);
  assert.match(h.text(), /form changed/);
});

for (const [baseUnits, displayed] of [
  ['100000000000000000', '0.1'],
  ['100000000000000001', '0.100000000000000001'],
]) {
  test(`checking delivered balance defaults to the exact full claim amount ${displayed}`, async t => {
    const chain = fixture();
    chain.set(WARP, 'claimable', bytes32Limbs(encoding), `${baseUnits}u128`);
    const calls: TransactionOptions[] = [];
    const h = await mount(
      t,
      async tx => {
        calls.push(tx);
        return { transactionId: 'claim-handle' };
      },
      chain.read,
      'claim',
      '',
    );
    assert.equal(h.amount().value, '');
    assert.equal(h.button().disabled, true);
    await h.inspect();
    assert.equal(h.amount().value, displayed);
    assert.equal(h.button().disabled, false);
    await h.click();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].inputs[1], `${baseUnits}u128`);
  });
}

test('a full-balance default can still be edited into a partial claim', async t => {
  const chain = fixture();
  chain.set(WARP, 'claimable', bytes32Limbs(encoding), '100000000000000000u128');
  const calls: TransactionOptions[] = [];
  const h = await mount(
    t,
    async tx => {
      calls.push(tx);
      return { transactionId: 'claim-handle' };
    },
    chain.read,
    'claim',
    '',
  );
  await h.inspect();
  await h.changeAmount('0.0005');
  await h.click();
  assert.equal(calls[0].inputs[1], '500000000000000u128');
});

test('an undelivered or fully claimed encoding does not prefill an arbitrary claim amount', async t => {
  const chain = fixture();
  chain.set(WARP, 'claimable', bytes32Limbs(encoding), '0u128');
  let calls = 0;
  const h = await mount(
    t,
    async () => {
      calls++;
      return undefined;
    },
    chain.read,
    'claim',
    '',
  );
  await h.inspect();
  assert.equal(h.amount().value, '');
  assert.equal(h.button().disabled, true);
  assert.equal(calls, 0);
});
