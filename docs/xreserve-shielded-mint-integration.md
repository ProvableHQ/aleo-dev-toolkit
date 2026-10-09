# Shield XReserve mint preparation

The optional `prepareShieldedUsdcxMint` adapter method asks Shield to prepare a
shielded USDCx deposit. It returns a public commitment, XReserve deposit
parameters, a wallet mint ID, and the adapter's retry ID. It does not submit an
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
import { Network, type PrepareShieldedUsdcxMintOptions } from '@provablehq/aleo-types';

const { prepareShieldedUsdcxMint, supportsShieldedUsdcxMint } = useWallet();
if (!supportsShieldedUsdcxMint) throw new Error('Select a compatible Shield wallet');

// Retain this object for retries of this deposit attempt.
const request: PrepareShieldedUsdcxMintOptions = {
  network: Network.TESTNET,
  sourceChain: 'ethereum-sepolia',
  amount: '1000000', // 1 USDC, in base units
  maxFee: '10000',
  recipient: recipientAddressFromForm, // optional; any valid Aleo address
};
const prepared = await prepareShieldedUsdcxMint(request);
```

`depositor` is also optional, so this call can precede EVM wallet connection.
If supplied, Shield binds the nonzero EVM address to the intent and checks it
against the completion payload. If omitted, Shield obtains the depositor from
the attested source deposit and shows it in mint approval. The depositor must
still be canonical and nonzero. Do not add or change it on a retry under the
same request ID; retain the original preparation request.

An omitted recipient defaults inside the wallet to the connected Aleo account.
An explicit recipient can be another person's address. The wallet validates and
shows the actual recipient for approval, and binds the commitment and completion
to it. The wallet preparing the deposit retains the private nonce and recovery
identity even when another address receives the tokens. Address-withheld
connections do not require the adapter to learn the default recipient.

`prepared.deposit.remoteRecipient` is the encoded wrapper address, not the
recipient entered in the form. `hookData` is `0x02 || commitment32 || zero32`.
The final 305-byte payload and Circle attestation become available after the
source-chain deposit; preparation cannot generate them in advance.

## Automatic retry identity

Users never enter `requestId`. The adapter generates a UUID when it is omitted.
Reusing the same options object with the same adapter reuses that UUID, including
concurrent calls and retries after a failure. A new options object creates a new
deposit attempt, even if its other fields are identical. The adapter never
mutates the caller's object.

For retries across reloads, or code that reconstructs request objects on every
render, create and save a request **before** making the first wallet call:

```ts
import { createShieldedUsdcxMintRequest } from '@provablehq/aleo-wallet-adapter-core';

const savedRequest = createShieldedUsdcxMintRequest(request);
sessionStorage.setItem('bridge:pending-mint', JSON.stringify(savedRequest));
const prepared = await prepareShieldedUsdcxMint(savedRequest);

// After a reload, reconnect with the same account/network/origin and grants.
const restored = JSON.parse(sessionStorage.getItem('bridge:pending-mint')!);
const retried = await prepareShieldedUsdcxMint(restored);
```

Persist the public response along with the request when available. An already
prepared attempt can also be retried with `{ ...request, requestId:
prepared.requestId }`. An explicit ID is forwarded unchanged. The wallet rejects
changed inputs under an existing ID. Clear the saved attempt only when your
bridge lifecycle ends or the user deliberately starts a separate deposit.

## Complete the mint

Submit XReserve's source-chain deposit using the approved public parameters.
Once Circle supplies `{ payload, attestation, messageHash }`, complete via the
existing `executeTransaction` API with `private_mint` and a
`shielded-usdcx-secret-nonce` derived input at slot 3. Use the same recipient
approved during preparation. The adapter does not fetch, expose, or store the
secret scalar. `executeTransaction` submits after wallet approval; it is not a
simulation API.

## Validation

```sh
pnpm -r --filter @provablehq/aleo-wallet-adapter-react... --filter @provablehq/aleo-wallet-adapter-shield... build
pnpm test:xreserve
```

Tests cover provider forwarding, arbitrary and omitted recipients, address
withholding, unsupported wallets, automatic and persistent retry IDs,
concurrency, failed retries, changed-input rejection, and public-only responses.
