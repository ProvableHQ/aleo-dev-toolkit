import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALEO_BALANCE_TOKEN,
  getPrivateBalance,
  getPublicBalance,
  getWalletBalances,
  sumRecordBalance,
  WalletFeatureNotAvailableError,
} from '../dist/index.js';

const ADDRESS = 'aleo1owner';
const USDCX = { programId: 'usdcx_stablecoin.aleo', symbol: 'USDCx', decimals: 6 };
const REGISTRY = {
  programId: 'token_registry.aleo',
  tokenId: '77field',
  symbol: 'TKN',
  decimals: 6,
};

const credits = (microcredits, extra = {}) => ({
  recordPlaintext: `{\n  owner: ${ADDRESS}.private,\n  microcredits: ${microcredits}u64.private\n}`,
  spent: false,
  ...extra,
});
const token = (amount, tokenId, extra = {}) => ({
  recordPlaintext: `{\n  owner: ${ADDRESS}.private,\n  amount: ${amount}u128.private,\n  token_id: ${tokenId}.private\n}`,
  spent: false,
  ...extra,
});

const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe('sumRecordBalance', () => {
  it('adds the native records', () => {
    assert.equal(sumRecordBalance([credits(5), credits(7)], ALEO_BALANCE_TOKEN), '12');
  });

  it('leaves out spent records, pending outputs and records without a plaintext', () => {
    const records = [
      credits(5),
      credits(7, { spent: true }),
      credits(11, { provisional: true }),
      credits(13, { status: 'pending' }),
      { spent: false },
      null,
    ];
    assert.equal(sumRecordBalance(records, ALEO_BALANCE_TOKEN), '5');
  });

  it('keeps a u128 exact', () => {
    const big = '340282366920938463463374607431';
    assert.equal(
      sumRecordBalance([token(big, '1field'), token('1', '1field')], USDCX),
      '340282366920938463463374607432',
    );
  });

  it('counts only the token asked for, where a program holds several', () => {
    const records = [token('10', '77field'), token('4', '88field')];
    assert.equal(sumRecordBalance(records, REGISTRY), '10');
  });

  it('reads the plaintext a wallet names `plaintext`', () => {
    assert.equal(
      sumRecordBalance([{ plaintext: credits(9).recordPlaintext }], ALEO_BALANCE_TOKEN),
      '9',
    );
  });
});

describe('getPublicBalance', () => {
  it('reads the account mapping of credits.aleo', async () => {
    let url;
    const result = await getPublicBalance('mainnet', ADDRESS, ALEO_BALANCE_TOKEN, {
      fetch: async u => ((url = u), response(200, '1500000u64')),
    });
    assert.equal(
      url,
      `https://api.provable.com/v2/mainnet/program/credits.aleo/mapping/account/${ADDRESS}`,
    );
    assert.equal(result.amount, '1500000');
    assert.equal(result.status, 'ok');
  });

  it('reads the balances mapping of a token program', async () => {
    let url;
    const result = await getPublicBalance('testnet', ADDRESS, USDCX, {
      apiUrl: 'https://api.example/v2/',
      fetch: async u => ((url = u), response(200, '250u128')),
    });
    assert.equal(
      url,
      `https://api.example/v2/testnet/program/usdcx_stablecoin.aleo/mapping/balances/${ADDRESS}`,
    );
    assert.equal(result.amount, '250');
  });

  it('counts a missing entry as zero', async () => {
    for (const fetch of [async () => response(404, null), async () => response(200, null)]) {
      assert.equal(
        (await getPublicBalance('mainnet', ADDRESS, ALEO_BALANCE_TOKEN, { fetch })).amount,
        '0',
      );
    }
  });

  it('does not call a failed read zero', async () => {
    const failed = await getPublicBalance('mainnet', ADDRESS, ALEO_BALANCE_TOKEN, {
      fetch: async () => response(500, null),
    });
    assert.deepEqual(failed, { amount: null, status: 'unavailable' });
    const thrown = await getPublicBalance('mainnet', ADDRESS, ALEO_BALANCE_TOKEN, {
      fetch: async () => {
        throw new Error('offline');
      },
    });
    assert.deepEqual(thrown, { amount: null, status: 'unavailable' });
  });

  it('cannot read token_registry.aleo, which is keyed by a hash', async () => {
    const result = await getPublicBalance('mainnet', ADDRESS, REGISTRY, {
      fetch: async () => assert.fail('no request expected'),
    });
    assert.deepEqual(result, { amount: null, status: 'unavailable' });
  });
});

describe('getPrivateBalance', () => {
  it('asks for unspent records with their plaintext', async () => {
    const calls = [];
    const wallet = {
      requestRecords: async (...args) => (calls.push(args), [credits(5), credits(7)]),
    };
    const result = await getPrivateBalance(wallet, ALEO_BALANCE_TOKEN);
    assert.deepEqual(calls, [['credits.aleo', true, 'unspent']]);
    assert.equal(result.amount, '12');
  });

  it('says so when the wallet refuses the records', async () => {
    const wallet = {
      requestRecords: async () => {
        throw new Error('Decrypt permission denied');
      },
    };
    assert.deepEqual(await getPrivateBalance(wallet, ALEO_BALANCE_TOKEN), {
      amount: null,
      status: 'not_granted',
    });
  });
});

describe('getWalletBalances', () => {
  const answer = { network: 'mainnet', balances: [] };

  it('uses the wallet`s own getBalances when it has one', async () => {
    const params = { tokens: [{ programId: 'credits.aleo' }] };
    let received;
    const result = await getWalletBalances(
      { network: 'mainnet', getBalances: async p => ((received = p), answer) },
      params,
    );
    assert.equal(result, answer);
    assert.equal(received, params);
  });

  it('falls back when the wallet reports the feature missing', async () => {
    const wallet = {
      network: 'mainnet',
      account: { address: ADDRESS },
      getBalances: async () => {
        throw new WalletFeatureNotAvailableError('standard:get-balances');
      },
      requestRecords: async () => [credits(5)],
    };
    const result = await getWalletBalances(
      wallet,
      {},
      {
        fetch: async () => response(200, '9u64'),
      },
    );
    assert.equal(result.network, 'mainnet');
    assert.deepEqual(result.balances, [
      {
        programId: 'credits.aleo',
        tokenId: null,
        symbol: 'ALEO',
        decimals: 6,
        public: { amount: '9', status: 'ok', updatedAt: result.balances[0].public.updatedAt },
        private: { amount: '5', status: 'ok', updatedAt: result.balances[0].private.updatedAt },
      },
    ]);
  });

  it('passes any other error from the wallet through', async () => {
    const wallet = {
      network: 'mainnet',
      getBalances: async () => {
        throw new Error('Wallet is locked');
      },
    };
    await assert.rejects(getWalletBalances(wallet), /Wallet is locked/);
  });

  it('reports the tokens given and narrows them by params', async () => {
    const wallet = {
      network: 'mainnet',
      account: { address: ADDRESS },
      requestRecords: async program => (program === 'credits.aleo' ? [credits(1)] : []),
    };
    const options = {
      tokens: [ALEO_BALANCE_TOKEN, USDCX],
      fetch: async () => response(404, null),
    };
    const all = await getWalletBalances(wallet, {}, options);
    assert.deepEqual(
      all.balances.map(b => b.symbol),
      ['ALEO', 'USDCx'],
    );
    const one = await getWalletBalances(
      wallet,
      { tokens: [{ programId: USDCX.programId }] },
      options,
    );
    assert.deepEqual(
      one.balances.map(b => b.symbol),
      ['USDCx'],
    );
    assert.equal(one.balances[0].private.amount, '0');
  });

  it('can leave a side out', async () => {
    const wallet = {
      network: 'mainnet',
      account: { address: ADDRESS },
      requestRecords: async () => assert.fail('no records expected'),
    };
    const result = await getWalletBalances(
      wallet,
      {},
      {
        includePrivate: false,
        fetch: async () => response(200, '3u64'),
      },
    );
    assert.equal(result.balances[0].public.amount, '3');
    assert.equal(result.balances[0].private.status, 'not_granted');
  });

  it('needs a connected account for the fallback', async () => {
    await assert.rejects(
      getWalletBalances({ network: 'mainnet', requestRecords: async () => [] }),
      /not connected/,
    );
  });
});
