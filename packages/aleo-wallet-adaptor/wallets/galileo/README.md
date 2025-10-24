# @provablehq/aleo-wallet-adaptor-prove-alpha

Prove wallet connector (alpha) built on top of the Aleo wallet adaptor core.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-prove-alpha
```

Register it with the provider:

```tsx
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-prove-alpha';

const wallets = [new GalileoWalletAdapter()];
```

Working example: https://aleo-dev-toolkit-react-app.vercel.app/
