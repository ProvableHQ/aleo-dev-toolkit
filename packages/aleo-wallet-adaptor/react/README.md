# @provablehq/aleo-wallet-adaptor-react

React hooks and context providers for interacting with Aleo wallets.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-react
```

## Quick Start

```tsx
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';

const wallets = [new LeoWalletAdapter()];

export function App({ children }: { children: React.ReactNode }) {
  return <AleoWalletProvider wallets={wallets}>{children}</AleoWalletProvider>;
}
```

Full demo: https://aleo-dev-toolkit-react-app.vercel.app/

