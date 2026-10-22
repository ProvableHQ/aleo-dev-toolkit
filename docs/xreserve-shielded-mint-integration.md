# Shield XReserve mint preparation

The optional `prepareShieldedUsdcxMint` adapter method asks Shield to prepare a
shielded USDCx deposit. It returns a public commitment, XReserve deposit
parameters, a wallet mint ID, and the request's retry ID. It does not submit an
EVM deposit or an Aleo transaction, and never returns the secret scalar.

The injected Shield provider must implement this method. Older extensions and
the current remote/mobile facade report no support. Check
`supportsShieldedUsdcxMint` before offering the bridge action. Other wallet
adapters remain compatible; unsupported preparation rejects explicitly.

## Connection permissions

Configure the provider with the wrapper program and exact derived-input grant:

```tsx
import { SHIELDED_USDCX_MINT_GRANT } from '@provablehq/aleo-wallet-adapter-core';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adapter-react';
import { Network } from '@provablehq/aleo-types';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';

<AleoWalletProvider
  wallets={wallets}
  network={Network.TESTNET}
  decryptPermission={WalletDecryptPermission.NoDecrypt}
  programs={['shielded_usdcx_wrapper.aleo']}
  algorithmsAllowed={[SHIELDED_USDCX_MINT_GRANT]}
>
  <Bridge />
</AleoWalletProvider>;
```

The adapter does not silently widen connection permissions. The user approves
these grants in the wallet. `algorithmsSupported()` queries supported injected
providers at runtime so a bridge can also discover the nonce algorithm.

## Prepare a deposit

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { createShieldedUsdcxMintRequest } from '@provablehq/aleo-wallet-adapter-core';
import { Network } from '@provablehq/aleo-types';

const { prepareShieldedUsdcxMint, supportsShieldedUsdcxMint } = useWallet();
if (!supportsShieldedUsdcxMint) throw new Error('Select a compatible Shield wallet');

// Generate and save once when the user starts this deposit attempt.
const request = createShieldedUsdcxMintRequest({
  network: Network.TESTNET,
  sourceChain: 'ethereum-sepolia',
  amount: '1000000', // 1 USDC, in base units
  maxFee: '10000',
  recipient: recipientAddressFromForm, // optional; any valid Aleo address
});
sessionStorage.setItem('bridge:pending-mint', JSON.stringify(request));
const prepared = await prepareShieldedUsdcxMint(request);
```

`depositor` is also optional, so this call can precede EVM wallet connection.
If supplied, Shield binds the nonzero EVM address to the intent and checks it
against the completion payload. If omitted, Shield obtains the depositor from
the attested source deposit and shows it in mint approval. The depositor must
still be canonical and nonzero. Do not add or change it on a retry under the
same request ID; retain the original preparation request.

An omitted recipient defaults inside the wallet to the connected Aleo account.
An explicit recipient can be another person's address. The wallet validates the
recipient and binds the commitment and completion to it. Preparation uses the
existing connection grants without an approval popup; completion shows the
recipient in normal transaction approval. The wallet preparing the deposit
retains the private nonce and recovery identity even when another address
receives the tokens. Address-withheld
connections do not require the adapter to learn the default recipient.

`prepared.deposit.remoteRecipient` is the encoded wrapper address, not the
recipient entered in the form. `hookData` is `0x02 || commitment32 || zero32`.
The final 305-byte payload and Circle attestation become available after the
source-chain deposit; preparation cannot generate them in advance.

## Persistent retry identity

Users never enter `requestId`. `createShieldedUsdcxMintRequest` generates a UUID
when it is omitted; `prepareShieldedUsdcxMint` requires that ID. Generate and save
the request **before** the first wallet call, including in React. Create it in
the handler that starts a deposit, rather than during render or on every retry.

Retry with the saved request, including after a reload or adapter recreation:

```ts
// After a reload, reconnect with the same account/network/origin and grants.
const restored = JSON.parse(sessionStorage.getItem('bridge:pending-mint')!);
const retried = await prepareShieldedUsdcxMint(restored);
```

The ID is forwarded unchanged regardless of the request object's reference.
Concurrent calls, reconstructed objects, and new adapter instances can all
retry the same deposit by retaining the ID and inputs. The wallet rejects
changed inputs under an existing ID. The adapter never mutates the request.
Persist the public response alongside the request when available. Clear the
saved attempt only when the bridge lifecycle ends or the user deliberately
starts a separate deposit. Calling the factory again without an ID creates a
new deposit attempt, even when all other inputs are identical.

## Complete the mint

Submit XReserve's source-chain deposit using the prepared public parameters.
Once Circle supplies `{ payload, attestation, messageHash }`, complete via the
existing `executeTransaction` API with `private_mint` and a
`shielded-usdcx-secret-nonce` derived input at slot 3. Use the same recipient
specified during preparation. The adapter does not fetch, expose, or store the
secret scalar. `executeTransaction` submits after wallet approval; it is not a
simulation API.

## Validation

```sh
pnpm -r --filter react-app-example... build
pnpm test:xreserve
pnpm test:wallet-discovery
```

Tests cover provider forwarding, arbitrary and omitted recipients, address
withholding, unsupported wallets, required and persistent retry IDs,
concurrency, failed retries, changed-input rejection, and public-only responses.

The example app includes an **XReserve Mint** page at `/xreserve`, with a code
sample, permission configuration, saved requests, and public deposit parameters.
To check a compatible Shield extension:

1. Start the example with `pnpm adapter-app:dev`, then open `/xreserve`.
2. Choose the Aleo network, click **Configure mint permissions**, and connect
   with the Shield extension. Approve the wrapper program and nonce algorithm
   grant in the wallet.
3. Prepare with an omitted recipient and depositor. Verify that preparation
   returns a commitment and deposit parameters without another approval popup.
4. Retry, reload, and reconnect with the same wallet account, network, and grants.
   The saved attempt should return the same request ID, mint ID, and commitment.
5. Start a new deposit attempt and try an explicit Aleo recipient and expected
   EVM depositor. Also check failed retries and an older or unsupported wallet.

The example only prepares parameters. A funded source-chain deposit, Circle
attestation, and approved Aleo mint are separate steps in the bridge lifecycle.
