# @provablehq/shield-multichain

Optional Shield EVM/Solana account discovery, separate from the Aleo wallet
adapter, standard and React hook. This package has no runtime dependencies.

```ts
import { createShieldMultichainClient } from '@provablehq/shield-multichain';

const multichain = createShieldMultichainClient();
const evm = await multichain.evm.requestAccount();
const solana = await multichain.solana.requestAccount();
```

The injected contract is `window.shield.multichain`, version `1.0.0`, with
optional `evm` and `solana` namespaces. Each has `requestAccount()`; a wallet
must explicitly approve disclosure and return only public `{ family, address }`.
Sharing an address grants no signing authority. Missing namespaces reject with
`ShieldMultichainError` code `UNSUPPORTED`.

The provider emits `accountsChanged` and `disconnect` without account data.
Pending calls are cancelled when those events arrive. Clear displayed addresses
on either event. The client projects responses to public fields and detects a
provider replacement during a request. Wallets enforce origin/account bindings,
lock, revocation and consent at the source.

For another wallet surface, pass a provider resolver to
`createShieldMultichainClient(() => provider)`. For an already-connected remote
transport, `createRelayMultichainProvider(transport)` maps the same namespaces to
`multichain.evm.requestAccount` / `multichain.solana.requestAccount` RPC methods.
Its transport owns pairing, approval wake, timeouts and session binding.

See [the integration guide](../../docs/account-discovery.md) for shared-core,
extension, mobile and embedded-wallet responsibilities. No wallet implementation,
RPC service, balances or signing are added by this package.
