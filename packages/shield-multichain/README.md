# @provablehq/shield-multichain

Optional Shield EVM and Solana provider client, separate from the Aleo wallet
adapter, standard, and React hook. This package has no runtime dependencies.

```ts
import { createShieldMultichainClient } from '@provablehq/shield-multichain';

const multichain = createShieldMultichainClient();
const capabilities = await multichain.evm.getCapabilities();
const evm = await multichain.evm.requestAccount();
const freshEvm = await multichain.evm.requestAccount({ intent: 'new' });
```

The injected contract is `window.shield.multichain`, version `1.0.0`, with
optional `evm` and `solana` namespaces. Accounts returned by `requestAccount()`
are isolated, per-Aleo-account derived accounts (never Shield's internal
main-seed deposit bridge addresses). The wallet owns derivation, account
selection, and index recovery.

## EVM methods

- `getCapabilities()` — returns `{ chainIds, methods }` supported by the wallet.
- `getAccounts()` — silent read (no prompt) of EVM accounts already granted to
  this origin for the active Aleo account. Returns `[]` if locked, disconnected,
  or none have been shared yet.
- `requestAccount({ intent?: 'current' | 'new' })` — requests wallet approval to
  share an isolated EVM account. Sharing grants no signing authority.
- `signMessage({ from, message })` — EIP-191 `personal_sign` (UTF-8 or hex).
- `signTypedData({ from, typedData })` — EIP-712 structured data signing.
- `sendTransaction(request)` — wallet validates, simulates, signs, and
  broadcasts an EIP-1559 transaction on `chainId`, returning the tx hash.
- `signTransaction(request)` — signs an EIP-1559 transaction without
  broadcasting, returning raw signed tx hex. Restricted by Shield core policy to
  trusted `shield.fi` origins.

## Solana methods

- `getCapabilities()` — returns `{ clusters, methods }`.
- `getAccounts()` — silent read of Solana accounts already granted to this origin.
- `requestAccount({ intent?: 'current' | 'new' })` — requests wallet approval to
  share an isolated Solana account.
- `signMessage({ from, message })` — signs arbitrary bytes, returning `{ signature }`.
- `signTransaction({ from, transaction, cluster? })` — signs a serialized
  transaction, returning `{ signedTransaction }`.
- `signAndSendTransaction({ from, transaction, cluster? })` — signs and submits
  a serialized transaction, returning `{ signature }`.

## Lifecycle and relay transport

The provider emits `accountsChanged` and `disconnect` without account data.
Pending calls are cancelled with `ShieldMultichainError('SESSION_CHANGED')` when
either event arrives or if the provider/namespace object is replaced. Clear
displayed addresses on either event.

For an already-connected remote transport, `createRelayMultichainProvider(transport)`
maps all `evm` and `solana` methods onto `multichain.<family>.<method>` RPC
calls (encoding Solana `Uint8Array` payloads as base64 on the wire).

See [the integration guide](../../docs/account-discovery.md) for shared-core,
extension, mobile, and embedded-wallet responsibilities.
