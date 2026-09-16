# @provablehq/aleo-wallet-adapter-react

> Replaces `@provablehq/aleo-wallet-adaptor-react` (deprecated). Update dependencies and imports using the
> [migration guide](../../../docs/migrating-to-adapter.md).

React context, hooks, and utilities for consuming Aleo wallet adapters in browser applications.

## When to use it

- Wrap your React tree with a wallet provider that manages connection state, auto-connect, and error handling.
- Access wallet methods (`connect`, `executeTransaction`, `decrypt`, etc.) through a simple `useWallet` hook.
- Pair with the UI kit (`@provablehq/aleo-wallet-adapter-react-ui`) or build your own custom interface.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-react
```

## Quick start

```tsx
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adapter-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';

const wallets = [new ShieldWalletAdapter()];

export function App({ children }: { children: React.ReactNode }) {
  return <AleoWalletProvider wallets={wallets}>{children}</AleoWalletProvider>;
}
```

## Related packages

- `@provablehq/aleo-wallet-adapter-core` – underlying adapter interfaces consumed by the provider.
- `@provablehq/aleo-wallet-adapter-react-ui` – drop-in modals and buttons that work with this context.
- Wallet adapters such as `@provablehq/aleo-wallet-adapter-shield`, `-puzzle`, `-leo`, etc.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
