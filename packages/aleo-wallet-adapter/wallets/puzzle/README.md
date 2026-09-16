# @provablehq/aleo-wallet-adapter-puzzle

> Replaces `@provablehq/aleo-wallet-adaptor-puzzle` (deprecated). Update dependencies and imports using the
> [migration guide](../../../../docs/migrating-to-adapter.md).

Adapter that exposes the Puzzle wallet through the Aleo wallet adapter interfaces.

## When to use it

- Offer Puzzle wallet users a seamless connect experience in your Aleo dApp.
- Combine Puzzle with other wallets (Leo, Shield, Fox, Puzzle) in a single provider instance.
- Prototype wallet flows that rely on Puzzle’s capabilities without forking adapter logic.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-puzzle
```

## Usage

```tsx
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adapter-puzzle';

const wallets = [new PuzzleWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adapter-core` – required base implementation.
- `@provablehq/aleo-wallet-adapter-react` – provider that wires Puzzle into React apps.
- `@provablehq/aleo-wallet-adapter-react-ui` – wallet picker UI that automatically lists Puzzle when available.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
