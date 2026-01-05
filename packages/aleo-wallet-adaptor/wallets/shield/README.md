# @provablehq/aleo-wallet-adaptor-shield

Shield wallet connector (alpha) built on top of the Aleo wallet adaptor core.

## When to use it

- Integrate the Shield wallet (pre-release build) alongside other Aleo wallets.
- Experiment with Shield-specific features while maintaining the shared adaptor contract.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-shield
```

## Usage

```tsx
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';

const wallets = [new ShieldWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – required base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that wires this adapter into React apps.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
