# @provablehq/aleo-types

Reusable TypeScript definitions for Aleo accounts, transactions, networks, and API responses.

## When to use it

- Share consistent Aleo primitives across wallet adapters, hooks, and UI layers.
- Type application code that interacts with Aleo transaction execution or status polling.
- Avoid hand-rolled interfaces when consuming the Provable SDK or wallet adaptor APIs.

## Installation

```bash
pnpm add @provablehq/aleo-types
```

## Usage

```ts
import { Network, TransactionOptions } from '@provablehq/aleo-types';

const tx: TransactionOptions = {
  program: 'example.aleo',
  function: 'transfer_public',
  inputs: ['1u64', 'aleo1...'],
  fee: 1,
};

console.log('Submitting to network', Network.TESTNET3, tx);
```

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
