# @provablehq/aleo-wallet-standard

Canonical TypeScript definitions, feature flags, and event contracts that underpin the Aleo wallet adaptor ecosystem.

## When to use it

- Build a wallet adapter that needs to advertise capabilities (connect, execute, decrypt, etc.).
- Consume adapter events (connect, disconnect, network change) in a type-safe way.
- Create tooling that inspects wallet features or chains without taking a dependency on React or the core implementation.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-standard
```

## Usage

```ts
import { WalletFeatureName, WalletReadyState } from '@provablehq/aleo-wallet-standard';

function logFeature(feature: WalletFeatureName, state: WalletReadyState) {
  console.log(`Feature ${feature} is ${state}`);
}
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – base adapter that implements these interfaces.
- `@provablehq/aleo-wallet-adaptor-react` – provider that exposes adapters implementing the standard.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
