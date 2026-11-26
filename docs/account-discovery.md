# Shield multichain provider

Multichain is a separate provider under `window.shield.multichain`, following
Shield's pattern of dedicated provider namespaces (such as `window.shield.bridge`).
It has no dependency on the Aleo wallet standard or adapter.

## Account model

Shield is not a general main-seed multichain wallet today: main-seed EVM and
Solana addresses stay internal to Shield's own Deposit/Hyperlane bridge flow and
are **not** exposed to dApps.

Instead, `window.shield.multichain` exposes **isolated per-Aleo-account derived
accounts** (for example, HKDF-SHA-256 over the active Aleo private key using
`shield/trading/v1/evm`, so both mnemonic and imported single-key Aleo accounts
can deterministically recover their accounts inside Shield).

## Public API

```ts
import { createShieldMultichainClient } from '@provablehq/shield-multichain';

const multichain = createShieldMultichainClient();
const caps = await multichain.evm.getCapabilities();
const evm = await multichain.evm.requestAccount();
const fresh = await multichain.evm.requestAccount({ intent: 'new' });

const signature = await multichain.evm.signTypedData({
  from: evm.address,
  typedData,
});

const txHash = await multichain.evm.sendTransaction({
  from: evm.address,
  chainId: 5042,
  to: '0x...',
  data: '0x...',
});
```

## Permission and safety rules

- **Wallet-owned account selection and recovery:** Sites request `'current'` or
  `'new'` intent only. Derivation paths, recovery indices, and seed phrases stay
  inside Shield's UI.
- **Explicit approval per action:** Every account disclosure, message/typed-data
  signature, and transaction requires explicit user review in Shield. Known
  protocols (such as HyperCore EIP-712 actions or Circle CCTP/xReserve calls)
  receive rich decoded review screens; unrecognized calls render a generic
  review screen with full parameters and a clear warning.
- **`evm.signTransaction` core restriction:** Raw EVM transaction signing
  without wallet broadcast is restricted by Shield core policy to trusted HTTPS
  `shield.fi` origins (plus loopback in test builds). Third-party dApps use
  `sendTransaction`, where Shield simulates and broadcasts via its configured
  RPC for `chainId`.
- **Payload-less invalidation events:** `accountsChanged` and `disconnect` carry
  no addresses so switching Aleo accounts never leaks another account to a
  connected site. Pending client calls reject with `SESSION_CHANGED`.
- **Origin and session binding:** An Aleo `connect` grant does not authorize
  multichain disclosure or signing. Wallets recheck origin, active Aleo account,
  lock state, and grant validity before and after every async approval step.

## Transport separation

Injected providers and mobile WebViews expose `window.shield.multichain.evm` /
`.solana`. `createRelayMultichainProvider(transport)` maps the exact same
contract over a connected relay transport using `multichain.<family>.<method>`
RPC method names and `multichain.accountsChanged` / `multichain.disconnect`
events. Solana binary payloads (`Uint8Array`) are base64-encoded over JSON
transports.
