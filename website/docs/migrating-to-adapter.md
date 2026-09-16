---
title: Migrating to Adapter
---

# Migrating from `adaptor` to `adapter`

The `@provablehq/aleo-wallet-adaptor-*` packages are deprecated in favor of
`@provablehq/aleo-wallet-adapter-*`. The spelling now matches the documentation
and the exported `WalletAdapter` classes. Existing versions remain available;
future fixes and features will be published under the `adapter` names.

## Package names

| Deprecated package                         | Replacement                                |
| ------------------------------------------ | ------------------------------------------ |
| `@provablehq/aleo-wallet-adaptor-core`     | `@provablehq/aleo-wallet-adapter-core`     |
| `@provablehq/aleo-wallet-adaptor-react`    | `@provablehq/aleo-wallet-adapter-react`    |
| `@provablehq/aleo-wallet-adaptor-react-ui` | `@provablehq/aleo-wallet-adapter-react-ui` |
| `@provablehq/aleo-wallet-adaptor-fox`      | `@provablehq/aleo-wallet-adapter-fox`      |
| `@provablehq/aleo-wallet-adaptor-leo`      | `@provablehq/aleo-wallet-adapter-leo`      |
| `@provablehq/aleo-wallet-adaptor-puzzle`   | `@provablehq/aleo-wallet-adapter-puzzle`   |
| `@provablehq/aleo-wallet-adaptor-shield`   | `@provablehq/aleo-wallet-adapter-shield`   |
| `@provablehq/aleo-wallet-adaptor-soter`    | `@provablehq/aleo-wallet-adapter-soter`    |

`@provablehq/aleo-types`, `@provablehq/aleo-wallet-standard`, and
`@provablehq/aleo-hooks` keep their names.

## 1. Replace your dependencies

These commands migrate a React app using Shield. Adjust both lists to include
only the packages your app uses, adding any other wallets from the table above.
Replace all of your direct `adaptor` dependencies together, including in other
workspace packages, to avoid mixing providers and hooks from different packages.

With npm:

```bash
npm uninstall @provablehq/aleo-wallet-adaptor-core @provablehq/aleo-wallet-adaptor-react @provablehq/aleo-wallet-adaptor-react-ui @provablehq/aleo-wallet-adaptor-shield
npm install @provablehq/aleo-wallet-adapter-core@^1.1.0 @provablehq/aleo-wallet-adapter-react@^1.1.0 @provablehq/aleo-wallet-adapter-react-ui@^1.1.0 @provablehq/aleo-wallet-adapter-shield@^1.1.0 @provablehq/aleo-wallet-standard@^1.2.0 @provablehq/aleo-types@^1.0.1
```

With pnpm:

```bash
pnpm remove @provablehq/aleo-wallet-adaptor-core @provablehq/aleo-wallet-adaptor-react @provablehq/aleo-wallet-adaptor-react-ui @provablehq/aleo-wallet-adaptor-shield
pnpm add @provablehq/aleo-wallet-adapter-core@^1.1.0 @provablehq/aleo-wallet-adapter-react@^1.1.0 @provablehq/aleo-wallet-adapter-react-ui@^1.1.0 @provablehq/aleo-wallet-adapter-shield@^1.1.0 @provablehq/aleo-wallet-standard@^1.2.0 @provablehq/aleo-types@^1.0.1
```

With Yarn:

```bash
yarn remove @provablehq/aleo-wallet-adaptor-core @provablehq/aleo-wallet-adaptor-react @provablehq/aleo-wallet-adaptor-react-ui @provablehq/aleo-wallet-adaptor-shield
yarn add @provablehq/aleo-wallet-adapter-core@^1.1.0 @provablehq/aleo-wallet-adapter-react@^1.1.0 @provablehq/aleo-wallet-adapter-react-ui@^1.1.0 @provablehq/aleo-wallet-adapter-shield@^1.1.0 @provablehq/aleo-wallet-standard@^1.2.0 @provablehq/aleo-types@^1.0.1
```

If you use `@provablehq/aleo-hooks`, update it to `^1.0.2` with your package
manager to pick up the wallet-standard dependency update.

## 2. Update imports, including CSS

Replace `@provablehq/aleo-wallet-adaptor-` with
`@provablehq/aleo-wallet-adapter-` in imports, re-exports, dynamic imports, and
bundler aliases or externals. Exported symbol names are unchanged by the rename.

```tsx
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adapter-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adapter-shield';
import '@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css';
```

Commit the updated manifest and lockfile, then run your app's build and tests.
If an old package remains as a transitive dependency, update the library that
depends on it as well. A provider from one package name cannot supply context to
hooks imported from the other.

## Included releases

All eight renamed packages start at `1.1.0`, continuing the previous `1.0.x`
version line. This release also includes the pending features and fixes:

- Shield remote relay pairing, bundled connect requests, cancellation, pairing
  URL events, dapp display metadata, and a light-background icon.
- React `pairingUrl` state and deselection/cancellation support.
- React UI pairing screens and connectable `LOADABLE` wallets.
- Wallet-standard `1.2.0`: pairing events, optional pairing/icon capabilities,
  and `isWalletConnectable`.
- Aleo hooks `1.0.2`: updated wallet-standard dependency.

`aleo-types` remains at `1.0.1`; it has no pending source changes. Historical
entries below `1.1.0` in adapter changelogs refer to the former package names.
