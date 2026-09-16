# @provablehq/aleo-wallet-adapter-soter

> Replaces `@provablehq/aleo-wallet-adaptor-soter` (deprecated). Update dependencies and imports using the
> [migration guide](../../../../docs/migrating-to-adapter.md).

Adapter that connects the Soter wallet to the Aleo wallet adapter ecosystem.

## When to use it

- Provide Soter wallet support in projects that already use the adapter core/provider.
- Offer Soter as one of several selectable wallets in the React UI kit.
- Test Soter-specific behaviours without adding custom integration code.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-soter
```

## Usage

```tsx
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adapter-soter';

const wallets = [new SoterWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adapter-core` – shared base implementation.
- `@provablehq/aleo-wallet-adapter-react` – React provider that consumes the adapter.
- `@provablehq/aleo-wallet-adapter-react-ui` – optional UI components for wallet selection.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
