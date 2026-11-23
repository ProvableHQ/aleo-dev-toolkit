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

## Hyperliquid trading accounts

Connect Shield first. `client.evm.requestTradingAccount()` asks for the current trading address.
Pass `{ fresh: true }` for a new address or `{ restoreIndex: i }` to recover a known index with wallet consent.
Receive addresses use the separate `requestAccount()` method.
Shield derives the same trading addresses from an imported Aleo private key or its original phrase.

`client.evm.signTradingAgent({ from, network, agentAddress, nonce, validUntil })` requests a HyperCore agent signature.
The wallet displays the signer, site, network, agent and expiration before approval.
Use milliseconds for nonce and expiration. A zero agent and null expiration revoke the unnamed agent.
Submit the matching approveAgent action to the same HyperCore network. The signature chain ID is 42161 for mainnet and 421614 for testnet.
Each supported browser host exposes these optional capabilities independently of public address discovery.
