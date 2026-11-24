# Bridge-independent address encoding

Compatible wallets expose `requestAddressEncoding` and the adapter's
`supportsAddressEncoding` capability. A commitment can be requested before
selecting XReserve, Hyperlane, or any warp route.

```ts
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { Network } from '@provablehq/aleo-types';

const { requestAddressEncoding, supportsAddressEncoding } = useWallet();
if (!supportsAddressEncoding) throw new Error('Update your wallet to request address encodings.');

const { commitmentHex } = await requestAddressEncoding({
  network: Network.TESTNET,
  // recipient: aleoRecipient, // optional; defaults to the connected account
});
```

A wallet connection with address access is required. The request accepts
`network` (`Network.MAINNET` or `Network.TESTNET`) and optional `recipient`.
No destination program, source chain, asset, amount, depositor, or bridge-specific
grant is needed for issuance. The adapter forwards the request unchanged; the
wallet validates its schema, recipient address, network, and access permissions.

The response contains only `commitmentHex`: 64 lowercase hex characters without
`0x`, encoding the canonical 32-byte little-endian commitment field. The wallet
retains the private nonce. The Shield adapter validates the commitment format
and excludes extra provider response fields.

Every successful request issues a fresh commitment. Save the returned encoding
before starting a deposit; calling this method again requests a new identity.
Issuance does not prepare a deposit, submit a transaction, or authorize use of the
private nonce in a later transaction.

Check `supportsAddressEncoding` before requesting an encoding. Older providers
without the method report `false`; the adapter does not substitute USDCx mint
preparation for generic address encoding.

## Hyperlane recipient example

For an EVM source, add the hex prefix without reversing or reinterpreting bytes:

```ts
const recipient = `0x${commitmentHex}`;
const destination = 1617853565; // Aleo TESTNET Hyperlane domain
const amount = 1000000000000000n; // 0.001 Sepolia ETH, in wei

// Use your source-chain client with a compatible deployed private-mint route:
// Quote native fees and attach the full ETH value (principal + fees).
await router.transferRemote(destination, recipient, amount, { value: quotedNativeValue });
```

The commitment occupies the existing `bytes32` recipient input. Your source-chain
client handles ABI encoding and validation. Use a deployed route that supports
encoded recipients before funding a deposit. Route and claim integration details
belong to the [Hyperlane private-mint specification](https://github.com/ProvableHQ/shield-core/blob/37d2c3c/docs/hyperlane-private-mint.md);
use the deployed destination program's ABI when implementing claims.

## Try the encoding example

```sh
pnpm install
pnpm adapter-app:dev
```

Open `/hyperlane` (**Transactions → Address Encoding**), connect a compatible
wallet on mainnet or testnet, and select **Request an encoding**. The example
displays the returned commitment with the `0x` prefix. Each request creates a
fresh commitment; save the exact bytes before using a compatible route.

The page demonstrates issuance only. Bridge deployment lookup, fee quoting,
source-chain transactions, private claims and burns belong in a bridge app.

## Full bridge demo

For quoting, Sepolia deposits, delivery tracking, private Aleo claims and private burns, use the [standalone Hyperlane bridge app](../examples/hyperlane-bridge/README.md). Run it with `pnpm bridge-app:dev`; its protocol and UI tests run with `pnpm --filter hyperlane-bridge-example test` and are outside package publishing.
