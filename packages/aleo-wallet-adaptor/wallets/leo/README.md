# @provablehq/aleo-wallet-adaptor-leo

Adapter that maps Leo wallet functionality onto the Aleo wallet adaptor contract.

## When to use it

- Allow users of the Leo wallet to connect, sign, decrypt, and execute transactions in your Aleo app.
- Pair Leo with other adapters in a single wallet list without branching your app logic.
- Prototype Leo-specific functionality while keeping the rest of your integration untouched.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-leo
```

## Usage

```tsx
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';

const wallets = [new LeoWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – shared adapter base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that surface Leo in React apps.
- Other wallet adapters (`-prove-alpha`, `-puzzle`, `-fox`, etc.) that can coexist with Leo.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
