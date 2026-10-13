---
title: Aleo Wallet Adapter
---

# Aleo Wallet Adapter

The **Aleo Wallet Adapter** provides a simple and unified interface for integrating Aleo wallets into your React applications. This guide will walk you through installation, setup, and usage of the wallet adapter.

- [Demo App](https://aleo-dev-toolkit-react-app.vercel.app/)

> **Migrating an existing app?** The `@provablehq/aleo-wallet-adaptor-*` names
> are deprecated in favor of `@provablehq/aleo-wallet-adapter-*`. See the
> [migration guide](../../docs/migrating-to-adapter.md) for uninstall/install
> commands and import changes, including CSS.

## 📲 Installation

Install the required dependencies:

```bash
npm install --save \
    @provablehq/aleo-wallet-adapter-react \
    @provablehq/aleo-wallet-adapter-react-ui \
    @provablehq/aleo-wallet-adapter-core \
    @provablehq/aleo-wallet-standard \
    @provablehq/aleo-types \
    react
```

Additionally, install one or more wallet adapters:

```bash
# Shield Wallet
npm install --save @provablehq/aleo-wallet-adapter-shield

# Leo Wallet
npm install --save @provablehq/aleo-wallet-adapter-leo

# Puzzle Wallet
npm install --save @provablehq/aleo-wallet-adapter-puzzle

# Fox Wallet
npm install --save @provablehq/aleo-wallet-adapter-fox

# Soter Wallet
npm install --save @provablehq/aleo-wallet-adapter-soter
```

## 🛠️ Setup

Wrap your application with the `AleoWalletProvider`:

```tsx
import React, { FC } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adapter-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adapter-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adapter-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adapter-soter';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adapter-core';
// Import wallet adapter CSS
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';

const wallets = [
  // appName/appIconUrl are optional, and label your dapp on the wallet's
  // approval screen. See the Shield adapter README.
  new ShieldWalletAdapter({
    appName: 'Example Dapp',
    appIconUrl: 'https://dapp.example/icon.png',
  }),
  new PuzzleWalletAdapter(),
  new LeoWalletAdapter(),
  new FoxWalletAdapter(),
  new SoterWalletAdapter(),
];

export const App: FC = () => {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={true}
      onError={error => console.error(error)}
    >
      {/* Your app components */}
    </AleoWalletProvider>
  );
};
```

`ShieldWalletAdapter` pairs with the Shield app from a plain mobile browser (no extension) by default. Production relay URL, deeplink, and transport are built in — pass a config object only to override them for testing, or `{ remote: false }` for injected-only behavior. An installed extension is preferred unless you set `preferExtension: false`, or pass `pairing: 'remote'` on a single `selectWallet` / `connect`. See the [Shield adapter README](./wallets/shield/README.md).

### Provider Props

- **`wallets`** (required): Array of wallet adapter instances
- **`network`** (optional): The Aleo network to connect to (`Network.MAINNET`, `Network.TESTNET`, or `Network.CANARY`). Defaults to `Network.TESTNET`
- **`decryptPermission`** (optional): Decrypt permission level. Options:
  - `DecryptPermission.NoDecrypt` - The dapp cannot decrypt any records (default)
  - `DecryptPermission.UponRequest` - The dapp can decrypt records upon request
  - `DecryptPermission.AutoDecrypt` - The dapp can decrypt any requested records
  - `DecryptPermission.OnChainHistory` - The dapp can request on-chain record plain texts and transaction ids and also decrypt any requested records
- **`autoConnect`** (optional): Whether to automatically connect on mount. Defaults to `false`
- **`programs`** (optional): Array of program IDs that will be called - Leave empty to allow any program to be called.
- **`onError`** (optional): Error handler callback
- **`localStorageKey`** (optional): Key for storing selected wallet in localStorage. Defaults to `'walletName'`
- **`readAddress`** (optional, Shield only): When `false`, the dapp transacts without ever learning the user's address. Defaults to `true`.
- **`recordAccess`** (optional, Shield only): Fine-grained grant controlling which record fields the dapp may read, narrowed by program, record, and field.
- **`algorithmsAllowed`** (optional, Shield only): Opt-in allowlist of wallet-side algorithms that can compute private inputs (e.g. blinding factors) without exposing them to the dapp.

For full details on the privacy props and how to use them, see the [Privacy-Preserving Dapps guide](../../docs/privacy-preserving-dapps.md).

## Using the `useWallet` Hook

The `useWallet` hook provides access to wallet state and methods:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { Network } from '@provablehq/aleo-types';

function MyComponent() {
  const {
    // State
    wallets,
    wallet,
    address,
    connected,
    connecting,
    disconnecting,
    reconnecting,
    network,

    // Methods
    selectWallet,
    connect,
    disconnect,
    executeTransaction,
    transactionStatus,
    subscribeTransactionStatus,
    signMessage,
    switchNetwork,
    decrypt,
    requestRecords,
    executeDeployment,
    transitionViewKeys,
    requestTransactionHistory,
  } = useWallet();

  // Your component logic
}
```

## Connecting to a Wallet

### Out-of-the-Box Solution

The wallet adapter provides a ready-to-use modal and button component. Simply wrap your app with `WalletModalProvider` and use the `WalletMultiButton` component:

```tsx
import { WalletModalProvider } from '@provablehq/aleo-wallet-adapter-react-ui';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adapter-react-ui';

export const App: FC = () => {
  return (
    <AleoWalletProvider wallets={wallets} network={Network.TESTNET}>
      <WalletModalProvider>
        <div>
          <WalletMultiButton />
          {/* Rest of your app */}
        </div>
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
```

The `WalletMultiButton` component automatically:

- Shows "Connect Wallet" when disconnected
- Opens a modal with available wallets when clicked
- Displays the connected wallet address when connected
- Provides a dropdown menu to disconnect or switch wallets

![Connect Wallet Modal](./docs/images/connect-modal.png)

### Manual Approach (Custom UI)

If you prefer to build your own wallet connection UI, you can use the `useWallet` hook directly:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { Network } from '@provablehq/aleo-types';
import { WalletNotSelectedError } from '@provablehq/aleo-wallet-adapter-core';

export const ConnectWallet: FC = () => {
  const { selectWallet, connect, wallet, connected, connecting, wallets } = useWallet();

  const handleConnect = async () => {
    try {
      // First, select a wallet
      if (!wallet) {
        // Select the wallet you want to connect (we will select the first one)
        const firstWallet = wallets[0];
        if (firstWallet) {
          selectWallet(firstWallet.adapter.name);
        } else {
          throw new WalletNotSelectedError();
        }
      }

      // Then connect (only needed if autoConnect is false on AleoWalletProvider)
      await connect(Network.TESTNET);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <button onClick={handleConnect} disabled={connecting || connected}>
      {connecting ? 'Connecting...' : connected ? 'Connected' : 'Connect Wallet'}
    </button>
  );
};
```

## ✍🏻 Signing Messages

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const SignMessage: FC = () => {
  const { address, signMessage, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const message = 'Hello, Aleo!';
    const signature = await signMessage(message);
    console.log('Signature:', new TextDecoder().decode(signature));
  }, [address, signMessage, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Sign Message
    </button>
  );
};
```

## 🔓 Decrypting Records

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const DecryptMessage: FC = () => {
  const { address, decrypt, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const cipherText = 'record1qyqsyqcyq5rqwzqfpgqshzv...'; // Your encrypted record
    const decryptedPayload = await decrypt(cipherText);
    console.log('Decrypted:', decryptedPayload);
  }, [address, decrypt, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Decrypt Record
    </button>
  );
};
```

## 🗂️ Requesting Records

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const RequestRecords: FC = () => {
  const { address, requestRecords, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const program = 'credits.aleo';
    // Request records (encrypted)
    const records = await requestRecords(program);
    console.log('Records:', records);

    // Request all the records with plaintext (requires appropriate decrypt permission)
    const recordsWithPlaintext = await requestRecords(program, true, 'all');
    console.log('All Records with plaintext:', recordsWithPlaintext);

    // Request all the unspent records
    const unspentRecordsWithPlaintext = await requestRecords(program, true, 'unspent');
    console.log('Unspent Records with plaintext:', unspentRecordsWithPlaintext);

    // Request all the spent records
    const spentRecordsWithPlaintext = await requestRecords(program, true, 'spent');
    console.log('Spent Records with plaintext:', spentRecordsWithPlaintext);
  }, [address, requestRecords, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Request Records
    </button>
  );
};
```

## 📡 Executing Transactions

`executeTransaction()` returns a wallet-issued transaction handle. Keep that handle for status tracking; the on-chain transaction ID becomes available later. For Shield, a public on-chain ID is not a substitute for the wallet handle.

### Submit and observe

`useTransaction()` submits a transaction and observes its wallet-issued handle. It clears state when the wallet, account, network, or connection changes. It also discards submission results that arrive after those changes or after a newer execution.

```tsx
import { useTransaction, useWallet } from '@provablehq/aleo-wallet-adapter-react';

export function ExecuteTransaction() {
  const { connected } = useWallet();
  const { execute, update, error, phase } = useTransaction();
  const busy = phase === 'submitting' || phase === 'watching';

  const submit = () =>
    execute({
      program: 'credits.aleo',
      function: 'transfer_public',
      inputs: ['aleo1...', '100u64'],
      fee: 100000,
      privateFee: false,
    });

  return (
    <div>
      <button onClick={submit} disabled={!connected || busy}>
        Execute Transaction
      </button>
      <p>Phase: {phase}</p>
      {update && <p>Status: {update.status}</p>}
      {update?.transactionId && <p>On-chain ID: {update.transactionId}</p>}
      {(error || update?.error) && <p role="alert">{error?.message || update?.error}</p>}
    </div>
  );
}
```

`phase` is `idle`, `submitting`, `watching`, `done`, or `failed`. Successful statuses include `accepted`, `confirmed`, `completed`, and `finalized`. Rejection, proving failure, and other unsuccessful terminal outcomes set `phase` to `failed`. A tracking interruption also sets `failed`; it does not establish that the chain rejected the transaction.

`execute(options)` resolves with the submitted handle. It resolves with `undefined` after an execution error or when a newer execution, scope change, or unmount supersedes the result. Execution and tracking errors appear in `error`; wallet-reported transaction details appear in `update.error`. Resetting the hook state does not cancel a transaction already submitted to the wallet.

`update.requestedTransactionId` always remains the wallet handle. `update.transactionId` is the on-chain ID and is absent before broadcast. The Shield adapter removes temporary handle echoes from older mobile providers, so applications need no ID-prefix checks.

### Observe an existing handle

```tsx
import { useTransactionStatus } from '@provablehq/aleo-wallet-adapter-react';
import { isSuccessfulTransactionStatus } from '@provablehq/aleo-types';

const { update, error, isWatching } = useTransactionStatus(walletTransactionHandle);
const succeeded = Boolean(update?.isTerminal && isSuccessfulTransactionStatus(update.status));
```

This primitive resets when its handle, adapter, account, network, or connection changes. It removes the previous subscription and ignores late updates. It does not own a submission that started outside the hook; use `useTransaction()` to cover that phase too. Ordinary provider re-renders and callback identity changes do not restart either hook's watch.

### Use callbacks directly

`useWallet()` and adapters expose `subscribeTransactionStatus(handle, onStatus, onError?)`. Shield uses native updates in the extension and in-app browser when the provider implements them. The base adapter supplies a serial poller for other connections, including older Shield providers and relay connections. It queries immediately, then waits one second after each response. Requests never overlap.

```tsx
const { subscribeTransactionStatus } = useWallet();
const unsubscribe = await subscribeTransactionStatus(
  walletTransactionHandle,
  update => {
    console.log('Status:', update.status);
    console.log('Wallet handle:', update.requestedTransactionId);
    console.log('On-chain ID:', update.transactionId);
    if (update.isTerminal) console.log('Terminal outcome:', update.status, update.error);
  },
  error => console.error('Status observation interrupted:', error.message),
);
// Retain unsubscribe and call it when the consumer leaves or changes scope.
```

Registration failures reject the promise. Later observation errors reach `onError`. A native registration failure does not switch to polling. An already-terminal snapshot can arrive before registration resolves. Subscriptions stop at terminal outcomes, including failures. Both React hooks also handle cleanup while registration is pending.

`isTerminalTransactionStatus(status)` and `isSuccessfulTransactionStatus(status)` from `@provablehq/aleo-types` share known status checks, ignoring case and surrounding whitespace. Native updates can additionally mark a future status terminal with `isTerminal: true`; an unknown status is never assumed successful.

`transactionStatus(handle)` remains a single request. Calling it once does not install a subscription or a recurring poll. Custom adapters that do not extend `BaseAleoWalletAdapter` must implement `subscribeTransactionStatus` to support these hooks.

## 💻 Deploying Programs

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import { AleoDeployment } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import React, { FC, useCallback } from 'react';

export const DeployProgram: FC = () => {
  const { address, executeDeployment, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const program = `
      program hello.aleo;
      function main:
        input r0 as u32.public;
        input r1 as u32.private;
        add r0 r1 into r2;
        output r2 as u32.private;
    `;

    const deployment: AleoDeployment = {
      program: program,
      address: address,
      priorityFee: 1000000, // Priority fee in microcredits
      privateFee: false,
    };

    try {
      const result = await executeDeployment(deployment);
      console.log('Deployment Transaction ID:', result.transactionId);
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  }, [address, executeDeployment, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Deploy Program
    </button>
  );
};
```

## 🔄 Switching Networks

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';
import React, { FC, useCallback } from 'react';

export const SwitchNetwork: FC = () => {
  const { address, switchNetwork, connected } = useWallet();

  const handleSwitch = useCallback(
    async (targetNetwork: Network) => {
      if (!connected || !address) {
        throw new WalletNotConnectedError();
      }

      try {
        const success = await switchNetwork(targetNetwork);
        if (success) {
          console.log(`Switched to ${targetNetwork}`);
        }
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    },
    [address, switchNetwork, connected],
  );

  return (
    <div>
      <button onClick={() => handleSwitch(Network.TESTNET)} disabled={!connected}>
        Switch to Testnet
      </button>
      <button onClick={() => handleSwitch(Network.MAINNET)} disabled={!connected}>
        Switch to Mainnet
      </button>
    </div>
  );
};
```

## 📜 Requesting Transaction History

This requires the `OnChainHistory` decrypt permission:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const RequestTransactionHistory: FC = () => {
  const { address, requestTransactionHistory, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const program = 'credits.aleo';
    const history = await requestTransactionHistory(program);
    console.log('Transaction History:', history);
  }, [address, requestTransactionHistory, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Request Transaction History
    </button>
  );
};
```

## 💰 Reading Balances

`getBalances` returns the public and private balance of each token. Amounts are
base-unit strings, so a u128 stays exact. Each reading has a `status`, so an
unknown balance is never shown as zero:

- `ok`: read recently.
- `stale`: the last good reading, not refreshed lately.
- `syncing`: the wallet has not read it yet.
- `not_granted`: the connection doesn't allow it, such as a private balance under `NO_DECRYPT`.
- `unavailable`: no reading is coming.

A wallet with its own `getBalances` (Shield) answers for the tokens it lists, and
adds the private side up itself, so records never reach the dapp. For any other
wallet, pass the tokens to report. The private side is then added up from
`requestRecords` (so the connection must allow reading records), and the public
side is read from the ledger.

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { ALEO_BALANCE_TOKEN } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

// Used only for wallets that can't list their own tokens.
const TOKENS = [
  ALEO_BALANCE_TOKEN,
  // `publicMapping`: where the program keeps public balances by address.
  { programId: 'usdcx_stablecoin.aleo', symbol: 'USDCx', decimals: 6, publicMapping: 'balances' },
];

export const Balances: FC = () => {
  const { getBalances, connected } = useWallet();

  const onClick = useCallback(async () => {
    const { balances } = await getBalances(undefined, { tokens: TOKENS });
    for (const { symbol, public: pub, private: priv } of balances) {
      console.log(symbol, pub.amount, pub.status, priv.amount, priv.status);
    }
  }, [getBalances]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Get Balances
    </button>
  );
};
```

Pass `{ tokens: [{ programId, tokenId? }] }` as the first argument to narrow the
answer. Outside React, `getWalletBalances(adapter, params, options)` from
`@provablehq/aleo-wallet-adapter-core` does the same.

## 🔑 Getting Transition View Keys

This requires the `OnChainHistory` decrypt permission:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const GetTransitionViewKeys: FC = () => {
  const { address, transitionViewKeys, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const transactionId = 'wallet-issued-handle'; // Transaction ID
    const viewKeys = await transitionViewKeys(transactionId);
    console.log('Transition View Keys:', viewKeys);
  }, [address, transitionViewKeys, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Get Transition View Keys
    </button>
  );
};
```

## 📊 Checking Transaction Status

`transactionStatus(handle)` performs one status check. It does not subscribe, repeat automatically, or wait for finalization; `await` only waits for that check's response. `useWallet()` itself does not poll. For continuous updates, use `useTransactionStatus` or the subscription methods above.

With Shield, the status check reads the wallet's stored status. The wallet updates that state through its existing background status resolution. A native subscription observes those changes and removes repeated dapp-to-wallet requests; it does not remove the wallet's own network polling.

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import React, { FC, useCallback } from 'react';

export const CheckTransactionStatus: FC = () => {
  const { address, transactionStatus, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    // Some wallets might only accept an internal transactionId,
    // others might accept both onchainId or wallet-specific internal transactionId
    const transactionId = 'wallet-issued-handle';
    const status = await transactionStatus(transactionId);
    console.log('Status:', status.status);
    console.log('On-chain Transaction ID:', status.transactionId);
    if (status.error) {
      console.error('Error:', status.error);
    }
  }, [address, transactionStatus, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Check Transaction Status
    </button>
  );
};
```

## 🔒 Privacy-Preserving Dapps

The **Shield wallet** supports a set of advanced privacy features that let your dapp transact while learning strictly less about the user:

- **`readAddress: false`** — transact without the dapp ever seeing the user's address.
- **`recordAccess`** — expose only the specific record fields your dapp needs, nothing more.
- **`InputRequest` slots** — let the wallet choose or compute inputs (records, addresses, derived values) without the dapp handling plaintext.
- **`algorithmsAllowed`** — allow the wallet to compute private cryptographic inputs (e.g. blinding factors) that never leave the wallet.

These features are opt-in and additive — existing dapps using literal string inputs continue to work unchanged.

For a full guide including the permission model, `InputRequest` shapes, derived inputs, and error handling, see the [Privacy-Preserving Dapps guide](../../docs/privacy-preserving-dapps.md).

## 🎯 Complete Example

Here's a complete example combining multiple features using the out-of-the-box wallet connection UI:

```tsx
import React, { FC, useCallback, useState } from 'react';
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adapter-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission, WalletNotConnectedError } from '@provablehq/aleo-wallet-adapter-core';
import { TransactionOptions } from '@provablehq/aleo-types';
// Import wallet adapter CSS
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';

const wallets = [new ShieldWalletAdapter()];

function WalletApp() {
  const { address, connected, executeTransaction, transactionStatus } = useWallet();
  const [txId, setTxId] = useState<string | null>(null);

  const handleTransaction = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const options: TransactionOptions = {
      program: 'credits.aleo',
      function: 'transfer_public',
      inputs: ['aleo1...', '100u64'],
      fee: 100000,
    };

    try {
      const result = await executeTransaction(options);
      if (result?.transactionId) {
        setTxId(result.transactionId);

        // Read one snapshot; use useTransactionStatus for continuous updates.
        const status = await transactionStatus(result.transactionId);
        console.log('Transaction status:', status);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  }, [connected, address, executeTransaction, transactionStatus]);

  return (
    <div>
      <WalletMultiButton />
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleTransaction} disabled={!connected}>
          Execute Transaction
        </button>
        {txId && <p>Transaction ID: {txId}</p>}
      </div>
    </div>
  );
}

export const App: FC = () => {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={true}
    >
      <WalletModalProvider>
        <WalletApp />
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};
```

## Shield XReserve mint preparation

Compatible Shield extensions expose `useWallet().prepareShieldedUsdcxMint()` and
`supportsShieldedUsdcxMint`. Preparation accepts an optional arbitrary Aleo
`recipient` and requires a `requestId`. Generate it once per deposit with
`createShieldedUsdcxMintRequest` and save the request before the first wallet call.
The expected EVM
`depositor` is optional, allowing encoding before selecting an EVM account. It returns public
commitment and deposit parameters; the wallet retains the secret nonce.

See the [XReserve integration guide](https://github.com/ProvableHQ/aleo-dev-toolkit/blob/master/docs/xreserve-shielded-mint-integration.md)
for connection grants, request persistence, and completion. Older wallets and
the current remote/mobile facade do not implement preparation.
