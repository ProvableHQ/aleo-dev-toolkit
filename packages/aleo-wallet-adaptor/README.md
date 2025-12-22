# Aleo Wallet Adapter

The **Aleo Wallet Adapter** provides a simple and unified interface for integrating Aleo wallets into your React applications. This guide will walk you through installation, setup, and usage of the wallet adapter.

## 📲 Installation

Install the required dependencies:

```bash
npm install --save \
    @provablehq/aleo-wallet-adaptor-react \
    @provablehq/aleo-wallet-adaptor-core \
    @provablehq/aleo-wallet-standard \
    @provablehq/aleo-types \
    react
```

Additionally, install one or more wallet adapters:

```bash
# Shield Wallet
npm install --save @provablehq/aleo-wallet-adaptor-shield

# Leo Wallet
npm install --save @provablehq/aleo-wallet-adaptor-leo

# Puzzle Wallet
npm install --save @provablehq/aleo-wallet-adaptor-puzzle

# Fox Wallet
npm install --save @provablehq/aleo-wallet-adaptor-fox

# Soter Wallet
npm install --save @provablehq/aleo-wallet-adaptor-soter
```

## 🛠️ Setup

Wrap your application with the `AleoWalletProvider`:

```tsx
import React, { FC, useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

const wallets = [
  new ShieldWalletAdapter(),
  new PuzzleWalletAdapter(),
  new LeoWalletAdapter(),
  new FoxWalletAdapter(),
  new SoterWalletAdapter(),
];

export const App: FC = () => {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET3}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={false}
      onError={error => console.error(error)}
    >
      {/* Your app components */}
    </AleoWalletProvider>
  );
};
```

### Provider Props

- **`wallets`** (required): Array of wallet adapter instances
- **`network`** (optional): The Aleo network to connect to (`Network.MAINNET`, `Network.TESTNET3`, or `Network.CANARY`). Defaults to `Network.TESTNET3`
- **`decryptPermission`** (optional): Decrypt permission level. Options:
  - `DecryptPermission.NoDecrypt` - The dapp cannot decrypt any records (default)
  - `DecryptPermission.UponRequest` - The dapp can decrypt records upon request
  - `DecryptPermission.AutoDecrypt` - The dapp can decrypt any requested records
  - `DecryptPermission.OnChainHistory` - The dapp can request on-chain record plain texts and transaction ids
- **`autoConnect`** (optional): Whether to automatically connect on mount. Defaults to `false`
- **`programs`** (optional): Array of program IDs to request access to
- **`onError`** (optional): Error handler callback
- **`localStorageKey`** (optional): Key for storing selected wallet in localStorage. Defaults to `'walletName'`

## 🎣 Using the `useWallet` Hook

The `useWallet` hook provides access to wallet state and methods:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
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

## 🔌 Connecting to a Wallet

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';
import { WalletNotSelectedError } from '@provablehq/aleo-wallet-adaptor-core';

export const ConnectWallet: FC = () => {
  const { selectWallet, connect, wallet, connected, connecting, wallets } = useWallet();

  const handleConnect = async () => {
    try {
      // First, select a wallet
      if (!wallet) {
        // Select the first available wallet
        const firstWallet = wallets[0];
        if (firstWallet) {
          selectWallet(firstWallet.adapter.name);
        } else {
          throw new WalletNotSelectedError();
        }
      }

      // Then connect
      await connect(Network.TESTNET3);
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
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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

    // Request records with plaintext (requires appropriate decrypt permission)
    const recordsWithPlaintext = await requestRecords(program, true);
    console.log('Records with plaintext:', recordsWithPlaintext);
  }, [address, requestRecords, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Request Records
    </button>
  );
};
```

## 📡 Executing Transactions

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import { TransactionOptions } from '@provablehq/aleo-types';
import React, { FC, useCallback } from 'react';

export const ExecuteTransaction: FC = () => {
  const { address, executeTransaction, transactionStatus, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const transactionOptions: TransactionOptions = {
      program: 'credits.aleo',
      function: 'transfer_public',
      inputs: [
        'aleo1...', // Recipient address
        '100u64', // Amount
      ],
      fee: 100000, // Transaction fee in microcredits
      privateFee: false, // Whether the fee is private
    };

    try {
      // Execute the transaction
      const result = await executeTransaction(transactionOptions);
      console.log('Transaction ID:', result?.transactionId);

      // Optional: Poll for transaction status
      if (result?.transactionId) {
        const status = await transactionStatus(result.transactionId);
        console.log('Transaction Status:', status);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  }, [address, executeTransaction, transactionStatus, connected]);

  return (
    <button onClick={onClick} disabled={!connected}>
      Execute Transaction
    </button>
  );
};
```

## 💻 Deploying Programs

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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
      <button onClick={() => handleSwitch(Network.TESTNET3)} disabled={!connected}>
        Switch to Testnet3
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
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
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

## 🔑 Getting Transition View Keys

This requires the `OnChainHistory` decrypt permission:

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import React, { FC, useCallback } from 'react';

export const GetTransitionViewKeys: FC = () => {
  const { address, transitionViewKeys, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const transactionId = 'at1...'; // Transaction ID
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

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import React, { FC, useCallback } from 'react';

export const CheckTransactionStatus: FC = () => {
  const { address, transactionStatus, connected } = useWallet();

  const onClick = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const transactionId = 'at1...'; // Transaction ID
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

## 🎯 Complete Example

Here's a complete example combining multiple features:

```tsx
import React, { FC, useCallback, useState } from 'react';
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission, WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import { TransactionOptions } from '@provablehq/aleo-types';

const wallets = [new ShieldWalletAdapter()];

function WalletApp() {
  const {
    address,
    connected,
    connecting,
    connect,
    disconnect,
    executeTransaction,
    transactionStatus,
  } = useWallet();
  const [txId, setTxId] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    try {
      await connect(Network.TESTNET3);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, [connect]);

  const handleTransaction = useCallback(async () => {
    if (!connected || !address) {
      throw new WalletNotConnectedError();
    }

    const options: TransactionOptions = {
      program: 'credits.aleo',
      function: 'transfer',
      inputs: ['record1...', 'aleo1...', '100u64'],
      fee: 100000,
    };

    const result = await executeTransaction(options);
    if (result?.transactionId) {
      setTxId(result.transactionId);

      // Poll for status
      const status = await transactionStatus(result.transactionId);
      console.log('Transaction status:', status);
    }
  }, [connected, address, executeTransaction, transactionStatus]);

  return (
    <div>
      {!connected ? (
        <button onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <>
          <p>Connected: {address}</p>
          <button onClick={handleTransaction}>Execute Transaction</button>
          <button onClick={disconnect}>Disconnect</button>
          {txId && <p>Transaction ID: {txId}</p>}
        </>
      )}
    </div>
  );
}

export const App: FC = () => {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET3}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={false}
    >
      <WalletApp />
    </AleoWalletProvider>
  );
};
```
