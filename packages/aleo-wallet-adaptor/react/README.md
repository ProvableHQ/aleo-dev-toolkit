# @provablehq/aleo-wallet-adaptor-react

React context, hooks, and utilities for consuming Aleo wallet adapters in browser applications.

## When to use it

- Wrap your React tree with a wallet provider that manages connection state, auto-connect, and error handling.
- Access wallet methods (`connect`, `executeTransaction`, `decrypt`, etc.) through a simple `useWallet` hook.
- Pair with the UI kit (`@provablehq/aleo-wallet-adaptor-react-ui`) or build your own custom interface.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-react
```

## Quick start

```tsx
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';

const wallets = [new ShieldWalletAdapter()];

export function App({ children }: { children: React.ReactNode }) {
  return <AleoWalletProvider wallets={wallets}>{children}</AleoWalletProvider>;
}
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – underlying adapter interfaces consumed by the provider.
- `@provablehq/aleo-wallet-adaptor-react-ui` – drop-in modals and buttons that work with this context.
- Wallet adapters such as `@provablehq/aleo-wallet-adaptor-shield`, `-puzzle`, `-leo`, etc.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
