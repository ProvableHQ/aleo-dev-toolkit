# @provablehq/aleo-wallet-adaptor-react-ui

Drop-in React components—modals, buttons, icons—for projects that use the Aleo wallet adaptor provider.

## When to use it

- You already integrate `@provablehq/aleo-wallet-adaptor-react` and want production-ready UI elements.
- You need a wallet picker modal that adapts to installed/loadable wallets automatically.
- You prefer to customise styling via CSS variables rather than building UI from scratch.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-react-ui
```

Include the distributed stylesheet once in your bundle:

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

## Related packages

- `@provablehq/aleo-wallet-adaptor-react` – required provider context for these components.
- Wallet adapters such as `@provablehq/aleo-wallet-adaptor-prove-alpha`, `-puzzle`, `-leo`, etc.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
