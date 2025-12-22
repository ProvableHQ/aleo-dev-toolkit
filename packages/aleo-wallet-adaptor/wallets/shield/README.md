# @provablehq/aleo-wallet-adaptor-shield

Prove wallet connector (alpha) built on top of the Aleo wallet adaptor core.

## When to use it

- Integrate the Prove wallet (pre-release build) alongside other Aleo wallets.
- Offer developers a preview experience before the final Prove branding and APIs are finalised.
- Experiment with Prove-specific features while maintaining the shared adaptor contract.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-shield
```

## Usage

```tsx
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';

const wallets = [new ShieldWalletAdapter()];
```

> **Note:** The exported class is still named `ShieldWalletAdapter` for internal compatibility. The package name will change again once the final brand is announced.

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – required base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that wires this adapter into React apps.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
