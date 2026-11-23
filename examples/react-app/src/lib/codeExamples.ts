// Placeholders that can be replaced with dynamic values
export const PLACEHOLDERS = {
  PROGRAM: '{{PROGRAM}}',
  STATUS_FILTER: '{{STATUS_FILTER}}',
  FUNCTION: '{{FUNCTION}}',
  INPUTS: '{{INPUTS}}',
  FEE: '{{FEE}}',
  CIPHER_TEXT: '{{CIPHER_TEXT}}',
  MESSAGE: '{{MESSAGE}}',
  TX_ID: '{{TX_ID}}',
} as const;

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
    !['hyperlane-claim-secret', 'program-freezelist-exclusion-proof']
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

  shieldedUsdcxMint: `import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { createShieldedUsdcxMintRequest, DecryptPermission, SHIELDED_USDCX_MINT_GRANT } from '@provablehq/aleo-wallet-adapter-core';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { Network } from '@provablehq/aleo-types';

const wallets = [new ShieldWalletAdapter({ remote: false })];

function MintExample() {
  const { connected, supportsShieldedUsdcxMint, prepareShieldedUsdcxMint } = useWallet();

  async function prepare() {
    // Save before the first call; retry the same request after a failure or reload.
    // Reconnect with the same account/network/origin and permissions before retrying.
    const stored = sessionStorage.getItem('bridge:pending-mint');
    const request = stored ? JSON.parse(stored) : createShieldedUsdcxMintRequest({
      network: Network.TESTNET,
      sourceChain: 'ethereum-sepolia',
      amount: '1000000',
      maxFee: '10000',
      // recipient: optionalAleoRecipient,
      // depositor: optionalEvmAddress,
    });
    sessionStorage.setItem('bridge:pending-mint', JSON.stringify(request));
    const prepared = await prepareShieldedUsdcxMint(request);
    console.log(prepared); // Public parameters and requestId; no secret nonce.
  }

  return <button disabled={!connected || !supportsShieldedUsdcxMint} onClick={prepare}>Prepare deposit</button>;
}

// Add your connection UI inside this provider.
export function App() {
  return (
    <AleoWalletProvider wallets={wallets} network={Network.TESTNET}
      decryptPermission={DecryptPermission.NoDecrypt}
      programs={['shielded_usdcx_wrapper.aleo']}
      algorithmsAllowed={[SHIELDED_USDCX_MINT_GRANT]}>
      <MintExample />
    </AleoWalletProvider>
  );
}`,
  executeTransaction: `import { useTransaction } from '@provablehq/aleo-wallet-adapter-react';

// Inside your component:
const { execute, update, error, phase } = useTransaction();

const submit = () => execute({
  program: '${PLACEHOLDERS.PROGRAM}',
  function: '${PLACEHOLDERS.FUNCTION}',
  inputs: [${PLACEHOLDERS.INPUTS}],
  fee: ${PLACEHOLDERS.FEE},
  // imports: ['target_program.aleo'], // required for call.dynamic
});

// Render update?.status, update?.transactionId, and error?.message.
// Disable submission while phase is 'submitting' or 'watching'.
// phase is 'done' on success, or 'failed' on rejection or a tracking error.
// Shield uses native updates; older connections use serial one-second polling.
// The hook clears state on wallet/account/network/disconnect changes.
// Late submission results and updates from previous scopes are discarded.`,

  signMessage: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { signMessage } = useWallet();

// Sign a message
const signature = await signMessage('${PLACEHOLDERS.MESSAGE}');

// Decode the signature to a string
const decoder = new TextDecoder();
const signatureStr = decoder.decode(signature);
console.log('Signature:', signatureStr);`,

  decrypt: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { decrypt } = useWallet();

// Decrypt a ciphertext
const decrypted = await decrypt('${PLACEHOLDERS.CIPHER_TEXT}');
console.log('Decrypted:', decrypted);`,

  requestRecords: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { requestRecords } = useWallet();

// Fetch records for a program
const records = await requestRecords('${PLACEHOLDERS.PROGRAM}', false, '${PLACEHOLDERS.STATUS_FILTER}');
console.log('Records:', records);`,

  getBalances: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { ALEO_BALANCE_TOKEN } from '@provablehq/aleo-wallet-adapter-core';

const { getBalances } = useWallet();

// The wallet's own getBalances where it has one (Shield), otherwise the private
// side is added up from requestRecords and the public side read from the ledger.
const { balances } = await getBalances(undefined, { tokens: [ALEO_BALANCE_TOKEN] });

for (const { symbol, decimals, public: pub, private: priv } of balances) {
  // Amounts are base-unit strings; status says whether to trust them.
  console.log(symbol, pub.amount, pub.status, priv.amount, priv.status);
}`,

  executeDeployment: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { executeDeployment, address } = useWallet();

// Deploy a program
const result = await executeDeployment({
  program: programCode,
  address: address,
  priorityFee: ${PLACEHOLDERS.FEE},
  privateFee: false,
});

console.log('Deployment TX ID:', result.transactionId);`,

  transitionViewKeys: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { transitionViewKeys } = useWallet();

// Get transition view keys for a transaction
const tvks = await transitionViewKeys('${PLACEHOLDERS.TX_ID}');
console.log('View Keys:', tvks);`,

  requestTransactionHistory: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { requestTransactionHistory } = useWallet();

// Get transaction history for a program
const history = await requestTransactionHistory('${PLACEHOLDERS.PROGRAM}');
console.log('Transactions:', history.transactions);`,

  privateInputs: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import type { RecordEnvelope } from '@provablehq/aleo-types';

const { requestRecords, executeTransaction } = useWallet();

// 1. Connect with a narrowed grant — only \`microcredits\` body field plus the
//    \`$commitment\` envelope-metadata token (passed at <AleoWalletProvider/>).
//
//    recordAccess: {
//      level: 'byProgram',
//      programs: [
//        {
//          program: '${PLACEHOLDERS.PROGRAM}',
//          records: [
//            { recordname: 'credits', fields: [
//              { name: 'microcredits' },
//              { name: '$commitment' },
//            ]},
//          ],
//        },
//      ],
//    }

// 2. Fetch records — the wallet returns RecordEnvelope[] with recordView and uid.
const records = (await requestRecords('${PLACEHOLDERS.PROGRAM}', true, 'unspent')) as RecordEnvelope[];
const chosen = records[0];

// 3. Pin that exact record by uid in a type: "record" InputRequest. Sending the
//    transfer to self via { type: "address" } proves end-to-end privacy: the
//    dapp never reads the owner address.
const tx = await executeTransaction({
  program: '${PLACEHOLDERS.PROGRAM}',
  function: '${PLACEHOLDERS.FUNCTION}',
  inputs: [
    { type: 'record', program: '${PLACEHOLDERS.PROGRAM}', uid: chosen.uid! },
    { type: 'address' },
    '100u64',
  ],
  fee: 200000,
});
console.log('Transaction Id:', tx?.transactionId);`,

  remoteConnect: `import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { WalletPairingQR } from '@provablehq/aleo-wallet-adapter-react-ui';

// Remote fallback is on by default: on browsers without an injected
// window.shield, Shield reports "Loadable" and connect() pairs with the
// Shield app over a deeplink + end-to-end-encrypted relay. Production
// relay URL, deeplink, and transport are the adapter defaults.
//
// preferExtension defaults to true: an injected extension wins. Set it
// false to pair via the relay on every connect.
const shield = new ShieldWalletAdapter({ preferExtension: true });

// Always pair via the app, even with the extension installed:
//   new ShieldWalletAdapter({ preferExtension: false });
// Or force the relay for one connect without mutating the adapter:
//   selectWallet('Shield Wallet', { pairing: 'remote' });

// Override any default for testing (LAN relay, preview deeplink):
//   new ShieldWalletAdapter({ remote: { relayUrl: 'http://192.168.1.20:8787' } });
// Disable the fallback:
//   new ShieldWalletAdapter({ remote: false });

// The adapter emits \`connectUrl\` while pairing (url + { resumed, sameDevice }).
// The react-ui wallet modal renders the QR / deeplink screen from it.
// For a custom pairing surface, pass the URL into WalletPairingQR:
//   const { pairingUrl, wallet } = useWallet();
//   return pairingUrl ? (
//     <WalletPairingQR value={pairingUrl} logoSrc={wallet?.adapter.iconOnLight ?? wallet?.adapter.icon} />
//   ) : null;
// or pass remote.onConnectUrl — both fire, and the mobile deeplink still
// goes automatically unless you set fireDeeplink: false.`,
} as const;

export type CodeExampleKey = keyof typeof codeExamples;
