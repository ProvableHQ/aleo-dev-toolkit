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
belong to the [Hyperlane private-mint specification](https://github.com/ProvableHQ/shield-core/blob/ff23ea9086327f2eed2782a1ef1e8392d55ed81b/docs/hyperlane-private-mint.md);
use the deployed destination program's ABI when implementing claims.

## Try a Sepolia ETH deposit

Run the React example:

```sh
pnpm install
pnpm adapter-app:dev
```

Open `/hyperlane` (**Transactions → Hyperlane Testnet Mint**):

1. Connect an Aleo wallet on **testnet** and request an encoding. The returned
   `0x` recipient fills the mint form. You can also paste an existing testnet
   encoding into **Address encoding — second input (bytes32)** without connecting
   an Aleo wallet. Keep the issuing wallet: its private nonce is needed to claim.
2. Enter an amount in Sepolia ETH. The default is `0.001`; the call's third input
   is its exact integer amount in wei.
3. Select **Connect Sepolia wallet & quote**. Approve the EVM wallet connection
   and switch to Ethereum Sepolia (chain ID `11155111`) if prompted.
4. Review the sender, bridge fee, full ETH transaction value, and all three
   `transferRemote` inputs. The second input is the unchanged 32-byte commitment;
   the first input is Aleo testnet's domain `1617853565`, not the mainnet domain.
5. Select **Send Sepolia ETH** and approve the transaction in your EVM wallet.
   Follow the Sepolia receipt and Hyperlane delivery links shown afterward.

The default [Sepolia ETH router](https://github.com/hyperlane-xyz/hyperlane-registry/blob/main/deployments/warp_routes/ETH/aleotestnet-config.yaml)
is `0x7c4aAAaB1f846881af95f5736d127F3F3F07F25F`, enrolled with
`test_hyp_warp_token_eth_v2.aleo` on Aleo testnet. The destination token is
`test_arc20_eth.aleo`. The example is fixed to this existing deployment.

The example sums the router's `quoteTransferRemote` native quotes, which already
include the bridged amount, to set the transaction's ETH value. Sepolia execution
gas is additional. It rechecks the fee, chain, and EVM account, then simulates the
exact transaction before requesting a signature. A changed recipient invalidates
the quote. A submitted hash stays visible even if confirmation times out; check
that transaction before making another deposit.

A Sepolia receipt confirms the source deposit. Hyperlane must still relay the
message to Aleo, where the encoding receives a claimable balance. The issuing
wallet must support the deployed route's private claim to receive spendable
private ETH; this example submits the source deposit and does not construct that
claim or expose the private nonce.

The EVM transaction code and its tests stay in the example app, outside the
wallet-generic adapter packages and release test gate. Run the example tests with:

```sh
pnpm --filter react-app-example test:hyperlane
```
