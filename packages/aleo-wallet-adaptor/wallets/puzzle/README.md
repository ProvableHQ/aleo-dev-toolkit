# @provablehq/aleo-wallet-adaptor-puzzle

Adapter that exposes the Puzzle wallet through the Aleo wallet adaptor interfaces.

## When to use it

- Offer Puzzle wallet users a seamless connect experience in your Aleo dApp.
- Combine Puzzle with other wallets (Leo, Shield, Fox, Puzzle) in a single provider instance.
- Prototype wallet flows that rely on Puzzle’s capabilities without forking adaptor logic.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-puzzle
```

## Usage

```tsx
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';

const wallets = [new PuzzleWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – required base implementation.
- `@provablehq/aleo-wallet-adaptor-react` – provider that wires Puzzle into React apps.
- `@provablehq/aleo-wallet-adaptor-react-ui` – wallet picker UI that automatically lists Puzzle when available.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
