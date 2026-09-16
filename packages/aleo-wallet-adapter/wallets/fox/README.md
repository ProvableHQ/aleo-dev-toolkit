# @provablehq/aleo-wallet-adapter-fox

> Replaces `@provablehq/aleo-wallet-adaptor-fox` (deprecated). Update dependencies and imports using the
> [migration guide](../../../../docs/migrating-to-adapter.md).

Adapter that exposes the Fox wallet through the Aleo wallet adapter interfaces.

## When to use it

- Provide Fox wallet connectivity in React (or headless) projects built on the adapter core.
- Offer Fox as an option in the modal UI alongside other supported wallets.
- Prototype Fox-specific flows while keeping the rest of the integration unchanged.

## Installation

```bash
pnpm add @provablehq/aleo-wallet-adapter-fox
```

## Usage

```tsx
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adapter-fox';

const wallets = [new FoxWalletAdapter()];
```

## Related packages

- `@provablehq/aleo-wallet-adapter-core` – shared adapter base.
- `@provablehq/aleo-wallet-adapter-react` – React provider that consumes this adapter.
- `@provablehq/aleo-wallet-adapter-react-ui` – wallet picker UI that automatically lists Fox when available.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
