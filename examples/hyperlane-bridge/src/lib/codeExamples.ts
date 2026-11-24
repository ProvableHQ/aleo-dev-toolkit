export const codeExamples = {
  hyperlaneRecipient: `import { useWallet, useTransaction } from '@provablehq/aleo-wallet-adapter-react';
import { Network } from '@provablehq/aleo-types';
import { formatEther } from 'viem';
// Example-local helpers, not published adapter APIs:
import { HYPERLANE_GRANTS, HYPERLANE_PROGRAMS, HYPERLANE_RECORD_ACCESS,
  readClaimable, preparePrivateClaim, quotePrivateBurn, preparePrivateBurn } from '@/lib/hyperlaneAleoTestnet';

// Connect on testnet with programs: HYPERLANE_PROGRAMS,
// algorithmsAllowed: HYPERLANE_GRANTS, recordAccess: HYPERLANE_RECORD_ACCESS,
// and readAddress: true. Reconnect after changing these permissions.
const { requestAddressEncoding, supportsAddressEncoding, algorithmsSupported,
  connected, network } = useWallet();
const { execute, update } = useTransaction();
const algorithms = await algorithmsSupported();
if (!connected || network !== Network.TESTNET || !supportsAddressEncoding ||
    !['route-bound-commitment-secret', 'program-freezelist-exclusion-proof']
      .every(name => algorithms.includes(name))) throw new Error('Update and reconnect your testnet wallet.');

const { commitmentHex } = await requestAddressEncoding({ network: Network.TESTNET });
const encoding = \`0x\${commitmentHex}\`;
// Save encoding. On Sepolia use transferRemote(1617853565, encoding, amountWei).
// Quote all native payments, simulate, and recheck both wallet contexts before sending.

// After delivery, the claimable balance is checked again. The wallet fills
// input 2 (recipient), input 3 (original secret), and input 4 (recipient proof).
const maximum = await readClaimable(encoding);
if (maximum === 0n) throw new Error('No delivered balance is available to claim yet.');
const claim = await preparePrivateClaim(encoding, formatEther(maximum));
await execute(claim); // User approves in wallet. Observe update?.status; do not blindly retry.

// A separate, user-initiated outbound action: show this quote for review first.
const quote = await quotePrivateBurn('0x1111111111111111111111111111111111111111', '0.001');
// Show quote.amount, quote.tokenFee, quote.net, and quote.dispatchMicrocredits.
// Recheck the same wallet account/network/permissions before each execute.
const burn = await preparePrivateBurn(quote); // Rejects changed route/fees.
await execute(burn);
// Wallet fills token record at 0, credits record at 1, signer proof at 9.
// The EVM destination at 6 is an encoded address, not an inbound commitment.
// Burn amount at 7 is GROSS; the bridged amount excludes the token fee.
// Omit the priority fee so Shield applies its fee strategy. Fee Master covers
// eligible execution fees when enabled; outbound dispatch still spends private ALEO.
`,
};
