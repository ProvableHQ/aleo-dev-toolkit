# @provablehq/aleo-wallet-adaptor-soter

Adapter that connects the Soter wallet to the Aleo wallet adaptor ecosystem.

## When to use it

- Provide Soter wallet support in projects that already use the adaptor core/provider.
- Offer Soter as one of several selectable wallets in the React UI kit.
- Test Soter-specific behaviours without adding custom integration code.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-soter
```

## Usage

```tsx
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';

const wallets = [new SoterWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – shared base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – React provider that consumes the adapter.
- `@provablehq/aleo-wallet-adaptor-react-ui` – optional UI components for wallet selection.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
