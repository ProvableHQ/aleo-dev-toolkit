// Placeholders that can be replaced with dynamic values
export const PLACEHOLDERS = {
  PROGRAM: '{{PROGRAM}}',
  FUNCTION: '{{FUNCTION}}',
  INPUTS: '{{INPUTS}}',
  FEE: '{{FEE}}',
  CIPHER_TEXT: '{{CIPHER_TEXT}}',
  MESSAGE: '{{MESSAGE}}',
  TX_ID: '{{TX_ID}}',
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
const records = await requestRecords('${PLACEHOLDERS.PROGRAM}', false);
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
} as const;

export type CodeExampleKey = keyof typeof codeExamples;
