# @provablehq/aleo-wallet-adapter-react-ui

> Replaces `@provablehq/aleo-wallet-adaptor-react-ui` (deprecated). Update dependencies and imports using the
> [migration guide](../../../docs/migrating-to-adapter.md).

Drop-in React components—modals, buttons, icons—for projects that use the Aleo wallet adapter provider.

## When to use it

- You already integrate `@provablehq/aleo-wallet-adapter-react` and want production-ready UI elements.
- You need a wallet picker modal that adapts to installed/loadable wallets automatically.
- You prefer to customise styling via CSS variables rather than building UI from scratch.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-react-ui
```

Include the distributed stylesheet once in your bundle:

```tsx
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';
```

## Usage

```tsx
import { WalletModalProvider, WalletMultiButton } from '@provablehq/aleo-wallet-adapter-react-ui';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WalletModalProvider>
      <WalletMultiButton />
      {children}
    </WalletModalProvider>
  );
}
```

### Pairing QR only

`WalletPairingQR` is the QR code from the pairing screen, without the rest of
the modal. It is presentational: pass the pairing URL (and optionally a
logo). A custom pairing UI is:

```tsx
import { WalletPairingQR } from '@provablehq/aleo-wallet-adapter-react-ui';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

export function Pairing() {
  const { pairingUrl, wallet } = useWallet();
  if (!pairingUrl) return null;
  return (
    <WalletPairingQR
      value={pairingUrl}
      logoSrc={wallet?.adapter.iconOnLight ?? wallet?.adapter.icon}
    />
  );
}
```

The code renders nothing until `value` is non-empty. Include the UI package
stylesheet so the white pad around the code is applied.

When the Shield extension is installed, the modal still prefers it
(`preferExtension` defaults to `true`). Pass `pairing: 'remote'` on
`selectWallet` to keep this QR available for that connect, or construct the
adapter with `preferExtension: false`.

## Related packages

- `@provablehq/aleo-wallet-adapter-react` – required provider context for these components.
- Wallet adapters such as `@provablehq/aleo-wallet-adapter-shield`, `-puzzle`, `-leo`, etc.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
