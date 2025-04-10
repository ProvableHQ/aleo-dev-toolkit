# Aleo Dev Toolkit

The **Aleo Dev Toolkit** is a monorepo containing a suite of libraries and tools designed to simplify the integration of Aleo wallets and blockchain functionality into your applications. Below is the structure of the repository and a brief explanation of each component.

## Getting Started

To get started, clone the repository and install dependencies:

```bash
git clone https://github.com/provablehq/aleo-dev-toolkit.git
cd aleo-dev-toolkit
pnpm install
```

Explore the `examples/` directory for sample projects or refer to the `docs/` directory for detailed documentation.

## Build

If you build on the root, it will build all packages.

```bash
pnpm build
```
## Repository Structure

```
aleo-dev-toolkit/                          (Monorepo Root)
├─ packages/
│   ├─ aleo-wallet-adaptor-standard/       (Wallet Standard Interfaces & Types)
│   │    ├─ src/
│   │    │    ├─ index.ts                 // Exports standard interfaces/types
│   │    │    ├─ chains.ts                // Defines Aleo chain/network constants
│   │    │    ├─ wallet.ts                // StandardWallet interface and related types
│   │    │    └─ features.ts              // Standard feature interfaces (connect, sign, etc.)
│   │    └─ package.json                 // Name: "@provablehq/aleo-wallet-adaptor-standard"
│   │
│   ├─ aleo-wallet-adaptor-core/           (Core wallet adapter logic and utilities)
│   │    ├─ src/
│   │    │    ├─ adapter.ts               // WalletAdapter interface & BaseAleoWalletAdapter class
│   │    │    ├─ errors.ts                // Standard error classes (WalletNotConnectedError, etc.)
│   │    │    ├─ transaction.ts           // Wrappers for Provable SDK transaction functions
│   │    │    ├─ account.ts               // Account utility functions
│   │    │    └─ index.ts                 // Re-exports common functionality
│   │    └─ package.json                 // Name: "@provablehq/aleo-wallet-adaptor-core"
│   │
│   ├─ aleo-wallet-adaptor-leo/            (LeoWallet adapter implementation)
│   │    ├─ src/
│   │    │    ├─ LeoWalletAdapter.ts      // Implements LeoWallet-specific logic (connect, requestTransaction, etc.)
│   │    │    ├─ types.ts                 // LeoWallet-specific types, if needed
│   │    │    └─ index.ts                 // Exports LeoWalletAdapter
│   │    └─ package.json                 // Name: "@provablehq/aleo-wallet-adaptor-leo"
│   │
│   ├─ aleo-wallet-adaptor-react/          (React integration for wallet adapter)
│   │    ├─ src/
│   │    │    ├─ context.ts               // Creates React context for wallet state
│   │    │    ├─ WalletProvider.tsx       // The provider component managing connection state and events
│   │    │    ├─ useWallet.ts             // Custom hook exposing wallet state and operations
│   │    │    └─ index.ts                 // Exports WalletProvider and hooks
│   │    └─ package.json                 // Name: "@provablehq/aleo-wallet-adaptor-react"
│   │
│   ├─ aleo-wallet-adaptor-react-ui/       (UI components for wallet adapter integration)
│   │    ├─ src/
│   │    │    ├─ WalletMultiButton.tsx    // Connect/disconnect button component
│   │    │    ├─ WalletModalProvider.tsx  // Provides modal UI for wallet selection
│   │    │    ├─ WalletListModal.tsx      // Modal component listing available wallets
│   │    │    └─ index.ts                 // Exports UI components
│   │    └─ package.json                 // Name: "@provablehq/aleo-wallet-adaptor-react-ui"
│   │
│   ├─ aleo-hooks/                         (Comprehensive React hooks library covering more than wallet connection)
│   │    ├─ src/
│   │    │    ├─ useWallet.ts             // Optionally, wraps wallet-adaptor-react’s hook or extends it with additional logic
│   │    │    ├─ useChainData.ts          // Hook for querying on-chain data, e.g., records or balances
│   │    │    ├─ useTransactionStatus.ts  // Hook to poll and manage transaction status updates
│   │    │    ├─ useNetwork.ts            // Hook to monitor network state, chain changes, etc.
│   │    │    └─ index.ts                 // Re-exports all hooks
│   │    └─ package.json                 // Name: "aleo-hooks" (or optionally under a namespace if desired)
├─ examples/                              (Example projects using the toolkit)
├─ docs/                                  (Documentation and specifications, including the Aleo Wallet Standard spec)
├─ package.json                           (Root package configuration for workspaces)
└─ README.md                              (High-level introduction and quick start)
```

### Key Components

1. **`aleo-wallet-adaptor-standard/`**  
    Defines the standard interfaces and types for Aleo wallet integration, including chain constants, wallet interfaces, and feature definitions.

2. **`aleo-wallet-adaptor-core/`**  
    Provides core wallet adapter logic, including base classes, error handling, and transaction utilities.

3. **`aleo-wallet-adaptor-leo/`**  
    Implements the wallet adapter for LeoWallet, handling wallet-specific logic such as connection and transaction requests.

4. **`aleo-wallet-adaptor-react/`**  
    Offers React integration for the wallet adapter, including context providers and hooks for managing wallet state.

5. **`aleo-wallet-adaptor-react-ui/`**  
    Contains reusable UI components for wallet integration, such as connect buttons and modals.

6. **`aleo-hooks/`**  
    A library of React hooks for advanced functionality, including chain data querying, transaction status tracking, and network monitoring.

7. **`examples/`**  
    Example projects demonstrating how to use the toolkit in real-world applications.

8. **`docs/`**  
    Documentation and specifications, including the Aleo Wallet Standard specification.

## Detailed Explanation of Each Package

### 1. `@provablehq/aleo-wallet-adaptor-standard`
**Purpose:** Define the standard interfaces and types all Aleo wallets should adhere to.

**Key Files:**
- `chains.ts`: Contains chain identifiers (e.g., `"aleo:mainnet"`, `"aleo:testnet"`).
- `wallet.ts`: Defines the `StandardWallet` interface that includes properties such as `name`, `icon`, `version`, `chains`, and a `features` object.
- `features.ts`: Describes the expected methods (e.g., `standard:connect`, `aleo:signTransaction`, `aleo:decrypt`) along with their types.

**Outcome:** Provides a clear contract that both wallet adapter implementations and wallet developers can follow, ensuring interoperability.

---

### 2. `@provablehq/aleo-wallet-adaptor-core`
**Purpose:** Offer the shared logic, base classes, and utility functions that underpin all wallet adapters.

**Key Files:**
- `adapter.ts`: Exports the `WalletAdapter` interface (e.g., methods like `connect`, `disconnect`, `requestTransaction`) and a base adapter class (`BaseAleoWalletAdapter`) that implements common functionality and event management.
- `transaction.ts`: Wraps calls to the Provable SDK (e.g., building transactions, generating proofs) so that wallet adapters can use these helpers without repeating code.
- `errors.ts`: Standard error classes to handle common issues (e.g., not connected, user rejection).

**Outcome:** Centralizes the core functionality and reduces duplication across different wallet adapters, making it easier to extend and maintain.

---

### 3. `@provablehq/aleo-wallet-adaptor-leo`
**Purpose:** Provide a concrete implementation for LeoWallet.

**Key Files:**
- `LeoWalletAdapter.ts`: Implements the abstract methods from the core adapter (`connect`, `disconnect`, `requestTransaction`) using LeoWallet’s provider API.
- `types.ts`: Defines any LeoWallet-specific types or extensions if necessary.

**Outcome:** Serves as the first reference adapter in the ecosystem. Its design can be adapted later for other wallets such as FoxWallet or Soter, or even generic standard wallets.

---

### 4. `@provablehq/aleo-wallet-adaptor-react`
**Purpose:** Deliver a React integration layer via context and hooks for seamless dApp development.

**Key Files:**
- `context.ts`: Creates and exports a React Context for wallet state management.
- `WalletProvider.tsx`: A provider component that wraps the dApp and manages wallet connection state (connecting, connected, current wallet adapter, etc.).
- `useWallet.ts`: A custom hook to expose wallet state and methods (`connect`, `disconnect`, `requestTransaction`, etc.) to components.

**Outcome:** Enables dApp developers to easily incorporate wallet connection logic into their React apps, reducing boilerplate and ensuring consistency.

---

### 5. `@provablehq/aleo-wallet-adaptor-react-ui`
**Purpose:** Supply pre-built UI components to accelerate integration—components like connect buttons or modals that work with the React hooks library.

**Key Files:**
- `WalletMultiButton.tsx`: A button component showing “Connect Wallet” when not connected, and account info when connected.
- `WalletModalProvider.tsx` & `WalletListModal.tsx`: Components managing the modal for wallet selection when multiple wallet adapters are available.

**Outcome:** Provides an out-of-the-box user interface that developers can adopt or customize, ensuring a consistent user experience across Aleo dApps.

---

### 6. `aleo-hooks`
**Purpose:** Establish a comprehensive set of React hooks that go beyond wallet connection, covering aspects such as querying on‑chain data, monitoring network state, transaction status tracking, and more.

**Key Files:**
- `useChainData.ts`: Hook to fetch and subscribe to on‑chain data (e.g., balances, record lists).
- `useTransactionStatus.ts`: Hook to check the status of pending transactions.
- `useNetwork.ts`: Hook to monitor the current network, chain ID, or connectivity issues.
- `index.ts`: Bundles and exports all hooks for straightforward import.

**Outcome:** This package serves as a larger, more general-purpose hooks library targeting Aleo dApp developers who need to build more complex, data-driven interfaces.