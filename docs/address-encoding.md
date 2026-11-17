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
needed for issuance. Only `network` and optional `recipient` are accepted; unknown
fields are rejected. The adapter checks the recipient's Aleo address format, and
the wallet validates the address and selected network. The wallet rechecks the
active account, selected network, and connection/address access after issuance;
it withholds the result if the context changes or access is revoked.
The response contains only `commitmentHex`: 64 lowercase hex characters without
`0x`, encoding the canonical 32-byte little-endian BHP256 commitment field.
The wallet retains the private scalar and permanent counter association.

Every successful request issues a fresh commitment and consumes the shared
wallet/network counter. Save the returned commitment before starting a deposit;
calling this method again requests a new identity. This method does not prepare
a deposit, submit a transaction, or grant permission to consume its private nonce.

## Hyperlane recipient selection

The React example app exposes **Transactions → Hyperlane Recipient** at
`/hyperlane`. Choose **Wallet-issued address encoding (private mint)**, request
an encoding, and select it in **Saved address encoding**. The page saves the
public encoding before producing arguments and only offers entries for the
connected wallet, account, Aleo network, and intended recipient. A later request
creates a new identity; selecting a saved entry reuses it without another wallet
call. Saved encodings survive reloads. The alternative **Manual bytes32
recipient** accepts an explicitly supplied `0x`-prefixed 32-byte recipient.

For an EVM source, add the hex prefix without reversing or reinterpreting bytes:

```ts
import {
  addressEncodingToHyperlaneRecipient,
  createHyperlaneTransferRemoteArgs,
} from '@provablehq/aleo-wallet-adapter-core';

const recipient = addressEncodingToHyperlaneRecipient({ commitmentHex });
const args = createHyperlaneTransferRemoteArgs({
  destination: 1634493807, // Aleo's Hyperlane destination domain
  recipient,
  amount: '1000000', // Source token base units, returned as bigint
});

// Use your source-chain client with a compatible deployed private-mint route:
await router.transferRemote(...args);
```

The ABI stays `transferRemote(uint32 destination, bytes32 recipient, uint256
amount)`. The encoding replaces the serialized address in the **existing recipient
input**; it is not a fourth input. The helper validates uint32/uint256 bounds and
preserves the 32-byte order. Solana uses those same raw 32 bytes in its existing
recipient slot. These source-transfer inputs apply to transfers **into Aleo**;
Aleo-origin `transfer_remote` inputs are unchanged.

The example prepares and copies arguments; it does not connect to an EVM wallet
or submit funds. The private-mint warp routes are not deployed yet. A compatible
route, source transaction construction, and redemption support are required
before funding an encoded recipient. Public-mint calls continue using the
serialized public address unless the caller explicitly chooses an encoding.

For Aleo redemption, interpret each 16-byte half of `commitmentHex` as a
little-endian `u128`: the first half is the low limb, the second the high limb.
The planned warp-route ABI is:

```leo
fn redeem(
    public commitment: [u128; 2],
    public amount: u128,
    private recipient: address,
    private secret: scalar,
    private recipient_merkle_proofs: [IARC22::MerkleProof; 2],
) -> (dyn record, dyn record, Final)
```

The secret scalar belongs at zero-based input **3**. Issuance does not authorize
secret fulfillment: the wallet still needs an explicitly authorized deployed
program and compliant Merkle-proof fulfillment. Existing USDCx-specific nonce
grants do not authorize a warp-route `redeem` call. XReserve's preparation API
and nonce slot are unchanged.

The Shield adapter detects the provider method itself. Older extensions and
relay/mobile providers without that method report `supportsAddressEncoding ===
false`; the adapter does not substitute the USDCx-specific preparation method.
Supporting extensions require the matching shield-core generic issuance API.
Wallet hosts use `AddressCommitmentCapabilities` in core and
`issueWalletAddressCommitment({ account, network, recipient? })` in the extension.
Issuance needs wallet key capabilities and the durable commitment store; mapping
reads, program lookup, and transaction fulfillment capabilities are not required.
