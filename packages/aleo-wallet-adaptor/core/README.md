# @provablehq/aleo-wallet-adaptor-core

Core utilities and base classes for building Aleo wallet adapters.

## Install

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

See a working integration in the demo app: https://aleo-dev-toolkit-react-app.vercel.app/

