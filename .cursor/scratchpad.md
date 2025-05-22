# Aleo Dev Toolkit - Pivot to Puzzle Wallet Adaptor

## Background and Motivation

Currently, the Aleo Dev Toolkit uses the Leo wallet adaptor, but we're encountering challenges with it. We need to pivot to supporting the Puzzle wallet instead. The Puzzle wallet has a different API interface, so we need to create a new adaptor that interfaces with our wallet standard and wallet core.

## Key Challenges and Analysis

1. The Puzzle wallet adapter implementation is available as a reference at [arcane-finance-defi/aleo-wallet-adapters](https://github.com/arcane-finance-defi/aleo-wallet-adapters/blob/main/src/puzzle.ts), but we need to adapt it to work with our wallet standard and wallet core.

2. The current Leo wallet adaptor implements these key interfaces:

   - `BaseAleoWalletAdapter` - from `@provablehq/aleo-wallet-adaptor-core`
   - Uses types from `@provablehq/aleo-types`
   - Follows the standard defined in `@provablehq/aleo-wallet-standard`

3. We need to remove the Leo wallet adaptor and create a new package for the Puzzle wallet adaptor, and update the workspace configuration accordingly.

4. The example app will need to be updated to use the Puzzle wallet adaptor instead of Leo.

## Dependencies and Integration Requirements

### Puzzle SDK Integration

- The Puzzle wallet adapter will depend on the Puzzle SDK (`@puzzlehq/sdk`)
- We need to map between our wallet standard's types and Puzzle SDK's types:
  - Network mappings: `WalletAdapterNetwork` ⟷ `Network` from Puzzle SDK
  - Transaction structure mappings
  - Error handling mappings
- We need to handle browser detection for the Puzzle wallet

### Package Dependencies

- **@puzzlehq/sdk**: For interfacing with the Puzzle wallet
- **@provablehq/aleo-wallet-adaptor-core**: Base adapter functionality
- **@provablehq/aleo-wallet-standard**: Wallet standard types and interfaces
- **@provablehq/aleo-types**: Common types for Aleo transactions and accounts

### Browser Integration

- Detect if Puzzle wallet is installed in the browser
- Handle wallet injection into the window object
- Manage connection state and events properly

## API Mapping Reference

### Network Mapping

```typescript
// From our WalletAdapterNetwork to Puzzle's Network
function convertToSDKNetwork(network: WalletAdapterNetwork): Network {
  switch (network) {
    case WalletAdapterNetwork.MAINNET:
      return Network.AleoMainnet;
    case WalletAdapterNetwork.TESTNET:
    default:
      return Network.AleoTestnet;
  }
}
```

### Transaction Execution Mapping

```typescript
// From our TransactionOptions to Puzzle's CreateEventRequestData
async executeTransaction(options: TransactionOptions): Promise<Transaction> {
  const requestData = {
    type: EventType.Execute,
    programId: options.program,
    functionId: options.function,
    fee: options.fee ? Number(options.fee) / 1000000 : undefined,
    inputs: options.inputs,
    address: this._publicKey,
    network: this._network
  } as CreateEventRequestData;

  const result = await requestCreateEvent(requestData);

  return {
    id: result.eventId!,
    status: TransactionStatus.PENDING,
    fee: options.fee,
  };
}
```

### Connection Mapping

```typescript
// From our connect method to Puzzle's connect
async connect(): Promise<Account> {
  const connectResponse: ConnectResponse = await connect({
    dAppInfo: {
      name: this._appName,
      iconUrl: this._appIconUrl,
      description: this._appDescription
    },
    permissions: {
      programIds: this._programIdPermissions
    },
  });

  return {
    address: connectResponse.connection.address
  };
}
```

### Error Mapping

```typescript
// Map Puzzle SDK errors to our wallet error types
try {
  // Puzzle SDK operation
} catch (error: any) {
  throw new WalletConnectionError(error?.message, error);
}
```

## High-level Task Breakdown

1. **Create a new `aleo-wallet-adaptor-puzzle` package**:

   - Initialize a new package in the packages directory
   - Create the necessary TypeScript configuration
   - Define the Puzzle wallet adaptor implementation based on the reference
   - Success Criteria: Package structure is set up correctly and TypeScript compilation works

   **Detailed Implementation:**

   - Create directory structure: `packages/aleo-wallet-adaptor-puzzle/`
   - Create `package.json` with dependencies:
     - `@provablehq/aleo-wallet-adaptor-core`
     - `@provablehq/aleo-wallet-standard`
     - `@provablehq/aleo-types`
     - `@puzzlehq/sdk` - This is the Puzzle wallet SDK package
   - Create `tsconfig.json` - Can be mirrored from other adaptors
   - Create `tsup.config.ts` for bundle configuration
   - Create `src/index.ts` as the entry point

2. **Implement the Puzzle wallet adaptor**:

   - Implement the `BaseAleoWalletAdapter` interface
   - Implement the Puzzle wallet API integration
   - Define the necessary types for the Puzzle wallet
   - Success Criteria: Puzzle wallet adaptor compiles without errors

   **Detailed Implementation:**

   - Create `src/types.ts` with necessary type definitions for Puzzle wallet
   - Create `src/PuzzleWalletAdapter.ts` implementing `BaseAleoWalletAdapter`
     - Implement constructor with necessary initialization
     - Implement `connect()` method using Puzzle SDK's connect method
     - Implement `disconnect()` method using Puzzle SDK's disconnect method
     - Implement `signTransaction()` method using Puzzle SDK's requestSignature
     - Implement `executeTransaction()` method using Puzzle SDK's requestCreateEvent
     - Implement network conversion utilities between our standards and Puzzle's
   - Export all types and adaptor in `src/index.ts`

3. **Update the workspace configuration**:

   - Update package.json at root to include the new package
   - Update pnpm-workspace.yaml if necessary
   - Success Criteria: Workspace configuration updated and working

   **Detailed Implementation:**

   - Ensure the new package is included in the workspace configuration
   - No changes needed to pnpm-workspace.yaml as it already includes all packages
   - Update any internal references to Leo wallet adaptor to point to Puzzle

4. **Update the example app**:

   - Remove Leo wallet adaptor import
   - Add Puzzle wallet adaptor import
   - Update the wallet initialization code
   - Success Criteria: Example app compiles without errors and uses the Puzzle wallet adaptor

   **Detailed Implementation:**

   - Update `examples/react-app/package.json` to remove Leo dependencies and add Puzzle
   - Update `examples/react-app/src/App.tsx`:
     - Replace `LeoWalletAdapter` imports with `PuzzleWalletAdapter`
     - Update the initialization code `useMemo(() => [new PuzzleWalletAdapter()])`
     - Update wallet connection button implementations if necessary

5. **Test the implementation**:

   - Test the connection flow
   - Test transaction signing and execution
   - Success Criteria: Puzzle wallet connects and performs transactions correctly

   **Detailed Implementation:**

   - Start the example app locally
   - Test wallet connection with Puzzle wallet
   - Test transaction signing and execution
   - Document any issues and fix them

## Implementation Details

### File Structure

```
packages/aleo-wallet-adaptor-puzzle/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts
    ├── types.ts
    └── PuzzleWalletAdapter.ts
```

### Key Files Content

#### package.json

```json
{
  "name": "@provablehq/aleo-wallet-adaptor-puzzle",
  "version": "0.1.0",
  "description": "Puzzle wallet adapter for Aleo",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup",
    "clean": "rm -rf dist",
    "dev": "tsup --watch"
  },
  "dependencies": {
    "@puzzlehq/sdk": "^0.2.0",
    "@provablehq/aleo-wallet-adaptor-core": "workspace:*",
    "@provablehq/aleo-wallet-standard": "workspace:*",
    "@provablehq/aleo-types": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^7.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### src/index.ts

```typescript
export * from './PuzzleWalletAdapter';
export * from './types';
```

#### src/types.ts

```typescript
import { ConnectionWithAccountInfo, Network } from '@puzzlehq/sdk';

/**
 * Puzzle window interface
 */
export interface PuzzleWindow extends Window {
  puzzle?: {
    connected: boolean;
    connect(): Promise<ConnectionWithAccountInfo>;
    disconnect(): Promise<void>;
  };
}

/**
 * Puzzle wallet adapter configuration
 */
export interface PuzzleWalletAdapterConfig {
  /**
   * Application name
   */
  appName?: string;

  /**
   * Application icon URL
   */
  appIconUrl?: string;

  /**
   * Application description
   */
  appDescription?: string;

  /**
   * Program ID permissions by network
   */
  programIdPermissions?: Record<Network, string[]>;
}
```

#### src/PuzzleWalletAdapter.ts

```typescript
import {
  Account,
  Transaction,
  TransactionOptions,
  TransactionStatus,
} from '@provablehq/aleo-types';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import {
  BaseAleoWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  WalletSignTransactionError,
} from '@provablehq/aleo-wallet-adaptor-core';
import {
  connect,
  disconnect,
  requestCreateEvent,
  requestSignature,
  EventType,
  Network,
} from '@puzzlehq/sdk';
import { PuzzleWindow, PuzzleWalletAdapterConfig } from './types';

/**
 * Puzzle wallet adapter
 */
export class PuzzleWalletAdapter extends BaseAleoWalletAdapter {
  /**
   * The wallet name
   */
  readonly name = 'Puzzle Wallet';

  /**
   * The wallet icon (base64-encoded SVG)
   */
  readonly icon = '...'; // Add base64 encoded Puzzle wallet icon here

  /**
   * App name
   */
  private _appName: string;

  /**
   * App icon URL
   */
  private _appIconUrl?: string;

  /**
   * App description
   */
  private _appDescription?: string;

  /**
   * Program ID permissions
   */
  private _programIdPermissions: Record<Network, string[]>;

  /**
   * Current network
   */
  private _network: Network;

  /**
   * Public key
   */
  private _publicKey?: string;

  /**
   * Create a new Puzzle wallet adapter
   * @param config Adapter configuration
   */
  constructor(config?: PuzzleWalletAdapterConfig) {
    super();
    this._appName = config?.appName || 'Aleo App';
    this._appIconUrl = config?.appIconUrl;
    this._appDescription = config?.appDescription;
    this._programIdPermissions = config?.programIdPermissions || {};
    this._network = Network.AleoTestnet;
    this._checkAvailability();
  }

  /**
   * Check if Puzzle wallet is available
   */
  private _checkAvailability(): void {
    if (typeof window === 'undefined') {
      this.readyState = WalletReadyState.UNSUPPORTED;
      return;
    }

    const puzzleWindow = window as PuzzleWindow;

    if (puzzleWindow.puzzle) {
      this.readyState = WalletReadyState.READY;
    } else {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      this.readyState = isMobile ? WalletReadyState.LOADABLE : WalletReadyState.UNSUPPORTED;
    }
  }

  /**
   * Connect to Puzzle wallet
   * @returns The connected account
   */
  async connect(): Promise<Account> {
    if (this.readyState !== WalletReadyState.READY) {
      throw new WalletConnectionError('Puzzle Wallet is not available');
    }

    try {
      const connectResponse = await connect({
        dAppInfo: {
          name: this._appName,
          iconUrl: this._appIconUrl,
          description: this._appDescription,
        },
        permissions: {
          programIds: this._programIdPermissions,
        },
      });

      this._publicKey = connectResponse.connection.address;

      const account: Account = {
        address: this._publicKey,
      };

      this.account = account;
      this.readyState = WalletReadyState.CONNECTED;
      this.emit('connect', account);

      return account;
    } catch (err: any) {
      this.emit('error', err);
      throw new WalletConnectionError(err.message || 'Connection failed');
    }
  }

  /**
   * Disconnect from Puzzle wallet
   */
  async disconnect(): Promise<void> {
    try {
      await disconnect();
      this._publicKey = undefined;
      this.account = undefined;
      this.readyState = WalletReadyState.READY;
      this.emit('disconnect');
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  /**
   * Sign a transaction with Puzzle wallet
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const message = JSON.stringify({
        program: options.program,
        function: options.function,
        inputs: options.inputs,
        fee: options.fee,
      });

      const signature = await requestSignature({
        message,
        address: this._publicKey,
        network: this._network,
      });

      return {
        id: signature.signature || '',
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error: any) {
      throw new WalletSignTransactionError(error?.message || 'Failed to sign transaction', error);
    }
  }

  /**
   * Execute a transaction with Puzzle wallet
   * @param options Transaction options
   * @returns The executed transaction
   */
  async executeTransaction(options: TransactionOptions): Promise<Transaction> {
    if (!this._publicKey || !this.account) {
      throw new WalletNotConnectedError();
    }

    try {
      const requestData = {
        type: EventType.Execute,
        programId: options.program,
        functionId: options.function,
        fee: options.fee ? Number(options.fee) / 1000000 : undefined,
        inputs: options.inputs,
        address: this._publicKey,
        network: this._network,
      };

      const result = await requestCreateEvent(requestData);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.eventId) {
        throw new Error('Could not create transaction');
      }

      return {
        id: result.eventId,
        status: TransactionStatus.PENDING,
        fee: options.fee,
      };
    } catch (error: any) {
      throw new Error(`Failed to execute transaction: ${error.message}`);
    }
  }
}
```

### Example App Update (App.tsx)

```tsx
import React, { useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletConnectButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import './App.css';

// Component to display wallet information
const WalletInfo = () => {
  const { wallet, account } = useWallet();

  if (!wallet || !account) {
    return <p>Please connect your wallet first.</p>;
  }

  return (
    <div className="wallet-info">
      <h2>Wallet Connected</h2>
      <p>
        <strong>Wallet Name:</strong> {wallet.name}
      </p>
      <p>
        <strong>Address:</strong> {account.address}
      </p>
    </div>
  );
};

export function App() {
  // memoize to avoid re‑instantiating adapters on each render
  const wallets = useMemo(
    () => [
      new PuzzleWalletAdapter({
        appName: 'Aleo Wallet Example',
        programIdPermissions: {
          AleoTestnet: ['hello_world.aleo'], // Example program IDs
        },
      }),
    ],
    [],
  );

  return (
    <AleoWalletProvider wallets={wallets} autoConnect>
      <header>
        <div className="app">
          <h1>Aleo Wallet Example</h1>
          <WalletConnectButton />
          <WalletInfo />
        </div>
      </header>
      <main>{/* your DApp's components */}</main>
    </AleoWalletProvider>
  );
}

export default App;
```

## Project Status Board

- [x] Create a new `aleo-wallet-adaptor-puzzle` package
  - [x] Initialize package structure
  - [x] Create core files
- [x] Implement the Puzzle wallet adaptor
  - [x] Implement base adapter
  - [x] Implement event emitter integration
  - [x] Implement connect functionality
  - [x] Implement transaction submission
- [x] Update the workspace configuration
- [x] Update the example app
- [ ] Test the implementation
  - [ ] Test wallet connection
  - [ ] Test transaction execution

## Executor's Feedback or Assistance Requests

Implementation completed:

1. Created the base adapter structure with PuzzleWalletAdapter class
2. Implemented event emitter functionality using the BaseAleoWalletAdapter's emit method
3. Implemented connect and transaction submission using Puzzle SDK functions
4. Updated the example app to use the new Puzzle wallet adapter

Next steps:

1. Build the project to verify compilation
2. Test the wallet connection in the example app
3. Test transaction submission functionality

## Lessons

1. Puzzle SDK uses a different network naming convention than our wallet standard, requiring careful mapping between the two.
2. The transaction fee format differs between our standard and Puzzle SDK (our standard uses microcredits).
3. Wallet availability detection requires special handling for mobile browsers vs. desktop.
