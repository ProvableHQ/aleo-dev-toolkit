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

A normal wallet connection with address access is required. No destination
program, source chain, asset, amount, depositor, or bridge-specific grant is
needed for issuance. The wallet validates the recipient and selected network.
The response contains only `commitmentHex`: 64 lowercase hex characters without
`0x`, encoding the canonical 32-byte little-endian BHP256 commitment field.
The wallet retains the private scalar and permanent counter association.

Every successful request issues a fresh commitment and consumes the shared
wallet/network counter. Save the returned commitment before starting a deposit;
calling this method again requests a new identity. This method does not prepare
a deposit, submit a transaction, or grant permission to consume its private nonce.

For Hyperlane, interpret the first and last 16 bytes as little-endian `u128`
values to form the `[u128; 2]` claimable mapping key. The agreed `claim_private`
input order is `recipient`, gross `amount`, private `secret_nonce`, and public
`unverified_fee_bps`: the private nonce belongs at zero-based input index 2.
Claim execution needs the wallet's separate integration with an authorized
deployed verifier. XReserve's existing preparation API and its nonce slot are
unchanged.

The Shield adapter detects the provider method itself. Older extensions and
relay/mobile providers without that method report `supportsAddressEncoding ===
false`; the adapter does not substitute the USDCx-specific preparation method.
Supporting extensions require the matching shield-core generic issuance API.
