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
const destination = 1634493807; // Aleo's Hyperlane destination domain
const amount = 1000000n; // Source token base units

// Use your source-chain client with a compatible deployed private-mint route:
await router.transferRemote(destination, recipient, amount);
```

The commitment occupies the existing `bytes32` recipient input. Your source-chain
client handles ABI encoding and validation. Use a deployed route that supports
encoded recipients before funding a deposit. Route and claim integration details
belong to the [Hyperlane private-mint specification](https://github.com/ProvableHQ/shield-core/blob/ff23ea9086327f2eed2782a1ef1e8392d55ed81b/docs/hyperlane-private-mint.md);
use the deployed destination program's ABI when implementing claims.

The React example app exposes **Transactions → Hyperlane Recipient** at
`/hyperlane`. Connect a compatible wallet and request an encoding for the
connected account and selected Aleo network. The page displays the `0x`-prefixed
recipient in memory and does not submit a transfer.
