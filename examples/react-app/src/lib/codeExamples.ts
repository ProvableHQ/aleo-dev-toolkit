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
  TARGET_PROGRAM: '{{TARGET_PROGRAM}}',
  FROM: '{{FROM}}',
  TO: '{{TO}}',
  AMOUNT: '{{AMOUNT}}',
  MINT_AMOUNT: '{{MINT_AMOUNT}}',
} as const;

export const codeExamples = {
  executeTransaction: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { executeTransaction, transactionStatus } = useWallet();

// Execute a transaction
const result = await executeTransaction({
  program: '${PLACEHOLDERS.PROGRAM}',
  function: '${PLACEHOLDERS.FUNCTION}',
  inputs: [${PLACEHOLDERS.INPUTS}],
  fee: ${PLACEHOLDERS.FEE},
});

// Poll for transaction status
const status = await transactionStatus(result.transactionId);
console.log('Status:', status.status);
console.log('On-chain TX ID:', status.transactionId);`,

  signMessage: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { signMessage } = useWallet();

// Sign a message
const signature = await signMessage('${PLACEHOLDERS.MESSAGE}');

// Decode the signature to a string
const decoder = new TextDecoder();
const signatureStr = decoder.decode(signature);
console.log('Signature:', signatureStr);`,

  decrypt: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { decrypt } = useWallet();

// Decrypt a ciphertext
const decrypted = await decrypt('${PLACEHOLDERS.CIPHER_TEXT}');
console.log('Decrypted:', decrypted);`,

  requestRecords: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { requestRecords } = useWallet();

// Fetch records for a program
const records = await requestRecords('${PLACEHOLDERS.PROGRAM}', false, '${PLACEHOLDERS.STATUS_FILTER}');
console.log('Records:', records);`,

  executeDeployment: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { executeDeployment, address } = useWallet();

// Deploy a program
const result = await executeDeployment({
  program: programCode,
  address: address,
  priorityFee: ${PLACEHOLDERS.FEE},
  privateFee: false,
});

console.log('Deployment TX ID:', result.transactionId);`,

  transitionViewKeys: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { transitionViewKeys } = useWallet();

// Get transition view keys for a transaction
const tvks = await transitionViewKeys('${PLACEHOLDERS.TX_ID}');
console.log('View Keys:', tvks);`,

  requestTransactionHistory: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const { requestTransactionHistory } = useWallet();

// Get transaction history for a program
const history = await requestTransactionHistory('${PLACEHOLDERS.PROGRAM}');
console.log('Transactions:', history.transactions);`,

  dynamicDispatch: `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { programIdToField } from '@/lib/programIdField';

const { executeTransaction, address } = useWallet();

// 1) (optional prep) mint yourself a balance on the target token — no imports needed
await executeTransaction({
  program: '${PLACEHOLDERS.TARGET_PROGRAM}',
  function: 'mint_public',
  inputs: [address, '${PLACEHOLDERS.MINT_AMOUNT}u128'],
  fee: ${PLACEHOLDERS.FEE},
});

// 2) dynamic-dispatch route_transfer through token_router — passes the new \`imports\` option
const targetField = programIdToField('${PLACEHOLDERS.TARGET_PROGRAM}');
const result = await executeTransaction({
  program: 'token_router.aleo',
  function: 'route_transfer',
  inputs: [
    targetField,
    '${PLACEHOLDERS.FROM}',
    '${PLACEHOLDERS.TO}',
    '${PLACEHOLDERS.AMOUNT}u128',
  ],
  imports: ['${PLACEHOLDERS.TARGET_PROGRAM}'],
  fee: ${PLACEHOLDERS.FEE},
});
console.log('Dispatch TX ID:', result.transactionId);`,
} as const;

export type CodeExampleKey = keyof typeof codeExamples;
