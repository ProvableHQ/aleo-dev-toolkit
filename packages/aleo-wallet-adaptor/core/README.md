# @provablehq/aleo-wallet-adaptor-core

Foundation utilities and base classes for implementing Aleo-compatible wallet adapters.

## When to use it

- Author a first-party or partner wallet adapter that plugs into the Aleo wallet ecosystem.
- Share common adapter behaviour (events, feature checks, network switching) across multiple wallet implementations.
- Build higher-level tooling (React hooks, UI kits) on a consistent adapter contract.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-core
```

## Usage

```ts
import { BaseAleoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-core';

class MyWalletAdapter extends BaseAleoWalletAdapter {
  // extend the base adapter with wallet-specific logic
}
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-react` – React provider and hooks built on this core.
- `@provablehq/aleo-wallet-adaptor-react-ui` – Pre-built React components for any adapter that extends the core.
- `@provablehq/aleo-wallet-standard` – Shared feature definitions and event interfaces consumed by the base adapter.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
