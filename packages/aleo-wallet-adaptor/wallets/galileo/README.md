# @provablehq/aleo-wallet-adaptor-galileo

Galileo wallet connector built on top of the Aleo wallet adaptor core.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-galileo
```

Register it with the provider:

```tsx
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-galileo';

const wallets = [new GalileoWalletAdapter()];
```

Working example: https://aleo-dev-toolkit-react-app.vercel.app/

