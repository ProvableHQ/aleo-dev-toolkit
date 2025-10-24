# @provablehq/aleo-wallet-adaptor-fox

Adapter that exposes the Fox wallet through the Aleo wallet adaptor interfaces.

## When to use it

- Provide Fox wallet connectivity in React (or headless) projects built on the adaptor core.
- Offer Fox as an option in the modal UI alongside other supported wallets.
- Prototype Fox-specific flows while keeping the rest of the integration unchanged.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adaptor-fox
```

## Usage

```tsx
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';

const wallets = [new FoxWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – shared adapter base.
- `@provablehq/aleo-wallet-adaptor-react` – React provider that consumes this adapter.
- `@provablehq/aleo-wallet-adaptor-react-ui` – wallet picker UI that automatically lists Fox when available.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
