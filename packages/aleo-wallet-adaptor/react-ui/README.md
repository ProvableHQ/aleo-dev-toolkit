# @provablehq/aleo-wallet-adaptor-react-ui

Pre-built React components for connecting to Aleo wallets.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-react-ui
```

Also import the bundled stylesheet:

```tsx
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
```

## Usage

```tsx
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WalletModalProvider>
      <WalletMultiButton />
      {children}
    </WalletModalProvider>
  );
}
```

See the end-to-end demo: https://aleo-dev-toolkit-react-app.vercel.app/

