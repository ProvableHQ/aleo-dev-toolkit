# @provablehq/aleo-wallet-adaptor-fox

Fox wallet adapter for the Aleo wallet adaptor ecosystem.

## Install

```bash
pnpm add @provablehq/aleo-wallet-adaptor-fox
```

Then register the adapter with the React provider:

```tsx
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';

const wallets = [new FoxWalletAdapter()];
```

End-to-end example: https://aleo-dev-toolkit-react-app.vercel.app/

