# React Standalone Example

A standalone Vite + React project that consumes the published Aleo wallet adaptor packages from npm.

## What's inside

- `@provablehq/aleo-wallet-adaptor-core` (0.1.1-alpha.0)
- `@provablehq/aleo-wallet-adaptor-react` and `react-ui`
- Wallet adapters: Prove Alpha, Puzzle, Leo, Fox, Soter
- The same demo UI shipped in the monorepo example, but wired to npm tags

## Getting started

```bash
cd examples/react-app-standalone
pnpm install
pnpm dev
```

This will install dependencies from npm (no `workspace:*` references) and start the Vite dev server.
