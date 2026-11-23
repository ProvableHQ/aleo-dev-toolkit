import { getAddress, parseEther } from 'viem';
import type { InputRequest, TransactionOptions } from '@provablehq/aleo-types';
import type { AlgorithmGrant, RecordAccessGrant } from '@provablehq/aleo-wallet-adapter-core';
import { ALEO_TESTNET_DOMAIN, SEPOLIA_ETH_ROUTER } from './hyperlaneTestnet';

export const WARP = 'test_hyp_warp_token_eth_v2.aleo';
export const TOKEN = 'test_arc20_eth.aleo';
export const FREEZELIST = 'shield_arc22_freezelist.aleo';
export const MAILBOX = 'test_hyp_mailbox.aleo';
export const HOOK_MANAGER = 'test_hyp_hook_manager.aleo';
export const SEPOLIA_DOMAIN = 11155111;
export const ZERO_ADDRESS = `aleo1${'q'.repeat(52)}3ljyzc`;
const U128_MAX = (1n << 128n) - 1n;
const U64_MAX = (1n << 64n) - 1n;
export const HYPERLANE_PROGRAMS = [WARP, TOKEN, 'credits.aleo'];
export const HYPERLANE_GRANTS: AlgorithmGrant[] = [
  {
    algorithm: 'route-bound-commitment-secret',
    program: WARP,
    function: 'claim_private',
    inputPosition: 3,
  },
  ...(['claim_private', 'transfer_remote_private'] as const).map((fn, index) => ({
    algorithm: 'program-freezelist-exclusion-proof',
    program: WARP,
    function: fn,
    inputPosition: index === 0 ? 4 : 9,
    argConstraints: { freezelistProgram: [FREEZELIST] },
  })),
];
export const HYPERLANE_RECORD_ACCESS: RecordAccessGrant = {
  level: 'byProgram',
  programs: [
    {
      program: TOKEN,
      records: [{ recordname: 'Token', fields: [{ name: 'amount', readAccess: false }] }],
    },
    {
      program: 'credits.aleo',
      records: [{ recordname: 'credits', fields: [{ name: 'microcredits', readAccess: false }] }],
    },
  ],
};
export type MappingReader = (
  program: string,
  mapping: string,
  key: string,
) => Promise<string | null>;
export const readTestnetMapping: MappingReader = async (program, mapping, key) => {
  const response = await fetch(
    `https://api.provable.com/v2/testnet/program/${program}/mapping/${mapping}/${encodeURIComponent(key)}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(`Aleo mapping read failed (${response.status}); try again.`);
  const value: unknown = await response.json();
  if (value !== null && typeof value !== 'string')
    throw new Error('Unexpected Aleo mapping response.');
  return value;
};
function required(value: string | null, name: string): string {
  if (value === null) throw new Error(`Missing ${name} on Aleo testnet.`);
  return value;
}
// These structs contain only primitive fields or fixed primitive arrays. Reject duplicates/missing fields.
function field(struct: string, name: string): string {
  const hits = [...struct.matchAll(new RegExp(`\\b${name}\\s*:\\s*(\\[[^\\]]*\\]|[^,}]+)`, 'g'))];
  if (hits.length !== 1) throw new Error(`Invalid chain state: ${name}.`);
  return hits[0][1].trim();
}
function uint(literal: string, type: 'u8' | 'u16' | 'u32' | 'u64' | 'u128'): bigint {
  if (!new RegExp(`^\\d+${type}$`).test(literal)) throw new Error(`Expected ${type} chain value.`);
  const n = BigInt(literal.slice(0, -type.length));
  const bits = BigInt(type.slice(1));
  if (n >= 1n << bits) throw new Error(`Chain value exceeds ${type}.`);
  return n;
}
function address(value: string): string {
  if (!/^aleo1[a-z0-9]{58}$/.test(value)) throw new Error('Invalid Aleo hook address.');
  return value;
}
export function ethAmount(value: string): bigint {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value.trim()))
    throw new Error('Enter an ETH amount with at most 18 decimal places.');
  const amount = parseEther(value.trim());
  if (amount <= 0n || amount > U128_MAX) throw new Error('Amount must be positive and fit u128.');
  return amount;
}
export function commitmentHex(value: string): string {
  const hex = value.trim().replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('Supply the original 32-byte address encoding.');
  return hex;
}
export function bytes32Limbs(value: string): string {
  const bytes = commitmentHex(value).match(/../g)!;
  const limb = (start: number) =>
    BigInt(
      `0x${bytes
        .slice(start, start + 16)
        .reverse()
        .join('')}`,
    );
  return `[${limb(0)}u128, ${limb(16)}u128]`;
}
const proof = (): InputRequest => ({
  type: 'derived',
  algorithm: 'program-freezelist-exclusion-proof',
  args: { freezelistProgram: { type: 'string', value: FREEZELIST } },
});
async function assertNotPaused(read: MappingReader, direction: 0 | 1) {
  const pause = await read(WARP, 'bridge_pause', 'true');
  if (pause === null) return; // Contract's get.or_use default is [false, false].
  const match = pause.match(/^\[\s*(true|false)\s*,\s*(true|false)\s*\]$/);
  if (!match) throw new Error('Invalid bridge pause state.');
  if (match[direction + 1] === 'true')
    throw new Error(`${direction ? 'Outbound transfers' : 'Inbound claims'} are paused.`);
}
export async function readClaimable(encoding: string, read = readTestnetMapping): Promise<bigint> {
  await assertNotPaused(read, 0);
  const value = await read(WARP, 'claimable', bytes32Limbs(encoding));
  return value === null ? 0n : uint(value, 'u128');
}
function options(
  fn: string,
  inputs: TransactionOptions['inputs'],
  feeMicrocredits?: string,
): TransactionOptions {
  if (
    feeMicrocredits !== undefined &&
    (!/^\d+$/.test(feeMicrocredits) ||
      !Number.isSafeInteger(Number(feeMicrocredits)) ||
      Number(feeMicrocredits) < 0)
  )
    throw new Error('Enter a nonnegative, safe integer priority fee in microcredits.');
  // Omit the priority fee by default so Shield applies its pricing and Fee Master strategy.
  return {
    program: WARP,
    function: fn,
    inputs,
    ...(feeMicrocredits !== undefined ? { fee: Number(feeMicrocredits) } : {}),
    privateFee: false,
  };
}
export async function preparePrivateClaim(
  encoding: string,
  amountEth: string,
  fee?: string,
  read = readTestnetMapping,
): Promise<TransactionOptions> {
  const hex = commitmentHex(encoding);
  const amount = ethAmount(amountEth);
  const balance = await readClaimable(hex, read);
  if (amount > balance)
    throw new Error(
      `Claimable balance is ${balance} base units. Wait for delivery or reduce the claim.`,
    );
  return options(
    'claim_private',
    [
      bytes32Limbs(hex),
      `${amount}u128`,
      { type: 'address' },
      {
        type: 'derived',
        algorithm: 'route-bound-commitment-secret',
        args: { commitment: { type: 'string', value: hex } },
      },
      proof(),
    ],
    fee,
  );
}
export type PrivateBurnQuote = {
  recipient: string;
  amount: bigint;
  tokenFee: bigint;
  net: bigint;
  feeBps: bigint;
  dispatchMicrocredits: bigint;
  inputs: TransactionOptions['inputs'];
  fingerprint: string;
};
export async function quotePrivateBurn(
  recipient: string,
  amountEth: string,
  read = readTestnetMapping,
): Promise<PrivateBurnQuote> {
  const evm = getAddress(recipient.trim());
  if (/^0x0{40}$/i.test(evm)) throw new Error('Supply a nonzero Sepolia recipient.');
  const amount = ethAmount(amountEth);
  await assertNotPaused(read, 1);
  const [metadataValue, routerValue, mailboxValue, rateValue] = await Promise.all([
    read(WARP, 'app_metadata', 'true'),
    read(WARP, 'remote_routers', `${SEPOLIA_DOMAIN}u32`),
    read(MAILBOX, 'mailbox', 'true'),
    read(WARP, 'private_transfer_fee_bps__', 'false'),
  ]);
  const metadata = required(metadataValue, 'warp metadata');
  const router = required(routerValue, 'Sepolia router');
  const mailbox = required(mailboxValue, 'mailbox');
  if (
    uint(field(metadata, 'local_decimals'), 'u8') !== 18n ||
    uint(field(metadata, 'remote_decimals'), 'u8') !== 18n ||
    uint(field(metadata, 'token_type'), 'u8') !== 1n
  )
    throw new Error('This example requires the 18-decimal ETH route.');
  if (
    uint(field(router, 'domain'), 'u32') !== BigInt(SEPOLIA_DOMAIN) ||
    uint(field(mailbox, 'local_domain'), 'u32') !== BigInt(ALEO_TESTNET_DOMAIN)
  )
    throw new Error('Unexpected Hyperlane domains.');
  const routerBytes = field(router, 'recipient')
    .slice(1, -1)
    .split(',')
    .map(v => Number(uint(v.trim(), 'u8')));
  const expectedRouter = `000000000000000000000000${SEPOLIA_ETH_ROUTER.slice(2).toLowerCase()}`;
  if (
    routerBytes.length !== 32 ||
    routerBytes.map(b => b.toString(16).padStart(2, '0')).join('') !== expectedRouter
  )
    throw new Error('The enrolled Sepolia router changed.');
  const feeBps = rateValue === null ? 0n : uint(rateValue, 'u16');
  if (feeBps >= 10000n) throw new Error('Invalid private transfer fee rate.');
  const tokenFee = (amount / 10000n) * feeBps + ((amount % 10000n) * feeBps) / 10000n;
  const net = amount - tokenFee;
  const defaultHook = address(field(mailbox, 'default_hook'));
  const requiredHook = address(field(mailbox, 'required_hook'));
  const customHook = address(field(metadata, 'hook'));
  if (defaultHook === ZERO_ADDRESS || requiredHook === ZERO_ADDRESS)
    throw new Error('Mailbox hooks must be configured.');
  const hooks = [customHook === ZERO_ADDRESS ? defaultHook : customHook, requiredHook];
  const gas = uint(field(router, 'gas'), 'u128');
  const unique = [...new Set(hooks)];
  const payments = await Promise.all(
    unique.map(async hook => {
      const type = uint(required(await read(HOOK_MANAGER, 'hooks', hook), 'hook type'), 'u8');
      if (type === 0n || type === 3n) return { hook, payment: 0n, state: `${hook}:${type}` };
      if (type !== 4n)
        throw new Error('Unsupported dispatch hook; cannot safely quote its credits.');
      const config = required(
        await read(
          HOOK_MANAGER,
          'destination_gas_configs',
          `{ igp: ${hook}, destination: ${SEPOLIA_DOMAIN}u32 }`,
        ),
        'destination gas config',
      );
      const gasTotal = (gas || 50000n) + uint(field(config, 'gas_overhead'), 'u128');
      const gasPriced = gasTotal * uint(field(config, 'gas_price'), 'u128');
      const product = gasPriced * uint(field(config, 'exchange_rate'), 'u128');
      if (gasTotal > U128_MAX || gasPriced > U128_MAX || product > U128_MAX)
        throw new Error('Dispatch quote exceeds u128.');
      const payment = product / 10000000000n;
      if (payment > U64_MAX) throw new Error('Dispatch payment exceeds u64.');
      return { hook, payment, state: `${hook}:${type}:${config}` };
    }),
  );
  // dispatch_private invokes both hooks, even if the effective and required hooks are identical.
  const dispatchMicrocredits = hooks.reduce(
    (sum, hook) => sum + payments.find(p => p.hook === hook)!.payment,
    0n,
  );
  if (dispatchMicrocredits > U64_MAX) throw new Error('Dispatch credits requirement exceeds u64.');
  const allowances = payments.map(p => `{ spender: ${p.hook}, amount: ${p.payment}u64 }`);
  while (allowances.length < 4) allowances.push(`{ spender: ${ZERO_ADDRESS}, amount: 0u64 }`);
  const mailboxState = `{ default_hook: ${defaultHook}, required_hook: ${requiredHook} }`;
  const inputs: TransactionOptions['inputs'] = [
    {
      type: 'record',
      program: TOKEN,
      recordname: 'Token',
      filters: { amount: { gte: `${amount}u128` } },
    },
    {
      type: 'record',
      program: 'credits.aleo',
      recordname: 'credits',
      filters: { microcredits: { gte: `${dispatchMicrocredits}u64` } },
    },
    metadata,
    mailboxState,
    router,
    `${SEPOLIA_DOMAIN}u32`,
    bytes32Limbs(`0x${'0'.repeat(24)}${evm.slice(2)}`),
    `${amount}u128`,
    `[${allowances.join(', ')}]`,
    proof(),
    `${feeBps}u16`,
  ];
  // Ignore insignificant whitespace but bind every input and hook config displayed in the quote.
  const fingerprint = JSON.stringify([inputs, payments.map(p => p.state)]).replace(/\s/g, '');
  return {
    recipient: evm,
    amount,
    tokenFee,
    net,
    feeBps,
    dispatchMicrocredits,
    inputs,
    fingerprint,
  };
}
export async function preparePrivateBurn(
  quote: PrivateBurnQuote,
  fee?: string,
  read = readTestnetMapping,
): Promise<TransactionOptions> {
  const fresh = await quotePrivateBurn(
    quote.recipient,
    `${quote.amount / 10n ** 18n}.${(quote.amount % 10n ** 18n).toString().padStart(18, '0')}`,
    read,
  );
  if (fresh.fingerprint !== quote.fingerprint)
    throw new Error('The route or fees changed. Review a new burn quote.');
  return options('transfer_remote_private', fresh.inputs, fee);
}
