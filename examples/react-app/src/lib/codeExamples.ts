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
  executeTransaction: `import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

const { executeTransaction, transactionStatus } = useWallet();

// Execute a transaction
const result = await executeTransaction({
  program: '${PLACEHOLDERS.PROGRAM}',
  function: '${PLACEHOLDERS.FUNCTION}',
  inputs: [${PLACEHOLDERS.INPUTS}],
  fee: ${PLACEHOLDERS.FEE},
  // imports: ['target_program.aleo'], // required when calling functions that use call.dynamic
});

// Poll for transaction status
const status = await transactionStatus(result.transactionId);
console.log('Status:', status.status);
console.log('On-chain TX ID:', status.transactionId);`,

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
// false to still show a QR / deeplink when the extension is installed.
const shield = new ShieldWalletAdapter({ preferExtension: true });

// Always pair via the app, even with the extension installed:
//   new ShieldWalletAdapter({ preferExtension: false });
// Or flip it for one screen on a shared adapter:
//   adapter.preferExtension = false;

// Override any default for testing (LAN relay, preview deeplink):
//   new ShieldWalletAdapter({ remote: { relayUrl: 'http://192.168.1.20:8787' } });
// Disable the fallback:
//   new ShieldWalletAdapter({ remote: false });

// The adapter emits \`connectUrl\` while pairing. The react-ui wallet
// modal renders the QR / deeplink screen from it — unless you present
// the code yourself:
//   const { pairingUrl } = useWallet();
//   return <WalletPairingQR />;
// or pass remote.onConnectUrl — both fire, and the mobile deeplink still
// goes automatically unless you set fireDeeplink: false.`,
} as const;

export type CodeExampleKey = keyof typeof codeExamples;
