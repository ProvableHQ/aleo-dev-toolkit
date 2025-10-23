# @provablehq/aleo-wallet-adaptor-puzzle

Adapter for connecting the Puzzle wallet to Aleo-enabled applications.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-puzzle
```

Register with the React provider:

```tsx
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';

const wallets = [new PuzzleWalletAdapter()];
```

Reference implementation: https://aleo-dev-toolkit-react-app.vercel.app/

