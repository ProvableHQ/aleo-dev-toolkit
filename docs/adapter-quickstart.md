# Aleo Wallet Adapter — dapp developer guide

This guide explains how to build privacy preserving Dapps with the Aleo Wallet Adapter.

For a working reference, see the component in
[`examples/react-app/src/components/functions/PrivateInputs.tsx`](../examples/react-app/src/components/functions/PrivateInputs.tsx)
and the provider wiring in [`examples/react-app/src/App.tsx`](../examples/react-app/src/App.tsx).

---

## Contents

1. [Packages](#1-packages)
2. [Basics: connecting and transacting](#2-basics-connecting-and-transacting)
3. [The `useWallet` hook](#3-the-usewallet-hook)
4. [Wallet capabilities: Shield versus the others](#4-wallet-capabilities-shield-versus-the-others)
5. [The permission model](#5-the-permission-model)
6. [Legacy apps and the version boundary](#6-legacy-apps-and-the-version-boundary)
7. [Reading records](#7-reading-records)
8. [Composing transaction inputs](#8-composing-transaction-inputs)
9. [Derived inputs](#9-derived-inputs)
10. [Building privacy-preserving dapps](#10-building-privacy-preserving-dapps)
11. [Handling failures](#11-handling-failures)
12. [Migration cheatsheet](#12-migration-cheatsheet)

---

## 1. Packages

The adapter is split across several packages. Most dapps only import from the React package and the
adapter package for each wallet they support; the rest provide the types and errors those packages
reference.

| Package | What it provides                                                                                                 |
|---|------------------------------------------------------------------------------------------------------------------|
| `@provablehq/aleo-wallet-adaptor-react` | Core `AleoWalletProvider` component and `useWallet` hook that provide ability to use Aleo wallets in react apps. |
| `@provablehq/aleo-wallet-adaptor-react-ui` | Optional pre-built wallet connection components for connecting to multiple ALeo Wallets.                         |
| `@provablehq/aleo-wallet-adaptor-core` | Core wallet adapter and wallet permission definitions.                                                           |
| `@provablehq/aleo-types` | Core Aleo types                                                                                                  |
| `@provablehq/aleo-wallet-standard` | The grant types `RecordAccessGrant` and `AlgorithmGrant`, along with `WalletReadyState`.                         |
| `@provablehq/aleo-wallet-adaptor-{shield,puzzle,leo,fox,soter}` | Concrete wallet adapters for each supported Aleo wallet.                                                         |

---

## 2. Connecting Aleo Wallets.

### Wiring up the provider

To create a multi-wallet dapp, adapters that the dapp needs to support must first be instantiated in a JS array that 
and then passed into the `wallets` parameter of the `AleoWalletProvider` component.  Any component rendered beneath
the provider can call `useWallet()` in order to invoke wallet connection flows.

```tsx
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

// Instantiate the adapters once, at module scope, rather than inside a render.
const wallets = [
  new ShieldWalletAdapter(),
  new PuzzleWalletAdapter(),
  new LeoWalletAdapter(),
];

export function App({ children }) {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      programs={['credits.aleo']}
      autoConnect
      onError={(err) => console.error(err.message)}
    >
      {children}
    </AleoWalletProvider>
  );
}
```

### Wallet Provider Parameters

`AleoWalletProvider` accept the following components.

| Prop | Type | Default | Purpose                                                                                                                                                                                                                               |
|---|---|---|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `wallets` | `WalletAdapter[]` | required | Wallets the dapp desires to offer.                                                                                                                                                                                                    |
| `network` | `Network` | `Network.TESTNET` | The network to connect against; one of `MAINNET` OR `TESTNET`.                                                                                                                                                                        |
| `decryptPermission` | `DecryptPermission` | `NoDecrypt` | The level of record and function output decryption to permit to the dapp.                                                                                                                                                             |
| `programs` | `string[]` | — | The program IDs the dapp intends to use.                                                                                                                                                                                              |
| `autoConnect` | `boolean` | `false` | Whether to reconnect to the last-selected wallet when an app loads.                                                                                                                                                                   |
| `onError` | `(error: WalletError) => void` | — | A central callback for wallet errors.                                                                                                                                                                                                 |
| `readAddress` | `boolean` | `true` | Whether or not to allow your dapp access to a wallet's addressed, further described in [§5](#5-the-permission-model).                                                                                                                 |
| `recordAccess` | `RecordAccessGrant` | `undefined` (broad) | Specification of fine-grained access to a a user's records. Privacy preserving dapps should specify explicit grants. Further documentation on how to specify privacy-preserving grants is described in [§5](#5-the-permission-model). |
| `algorithmsAllowed` | `AlgorithmGrant[]` | `undefined` (none) | Request wallet-supported algorithms to compute inputs for Aleo function inputs. More detail in [§5](#5-the-permission-model).                                                                                                         |

### Wallet Permissions

#### Decryption Permissions

The `DecryptPermission` enum, exported from `@provablehq/aleo-wallet-adaptor-core`, controls how much
the dapp may decrypt.

| Value | Meaning                                                                                                |
|---|--------------------------------------------------------------------------------------------------------|
| `NoDecrypt` | The dapp cannot decrypt any records.                                                                   |
| `UponRequest` | The dapp may decrypt records and function outputs when it asks, subject to user approval.              |
| `AutoDecrypt` | The dapp may decrypt any record or function output it requests.                                        |
| `OnChainHistory` | The dapp may request transaction IDs, but cannot decrypt records itself. |

### Shield-wallet specific permissions

The following advanced privacy-preserving capabilities are supported are provided by the Shield wallet, 
more info can be found at: [§4](#4-wallet-capabilities-shield-versus-the-others). If using the Shield wallet, it is 
recommended to use the most private settings possible in order for a dapp to function properly.

Detailed information on using the capabilities below can be found at [§5](#5-the-permission-model).

#### Address Visibility

The `readAddress` permission decides whether a wallet can view a signer's address or not. 

#### Record Access

The `recordAccess` permissions specifies fine-grained permissions to dapps. To preserve user privacy dapps can request
to read:
- **Low Privacy**: Broadly request to read all data from records for specific programs
- **Mid-Tier Privacy:** Request to read all data for specific records of specific programs
- **High Privacy:** Request to read only the necessary fields from specified (program, record, field[]) tuples. This
option provides the user with the MOST privacy.

In any of these cases, an record uid (unlinkable to transactions online) is provided. Dapps can specify the record UID
at any record input position to allow the wallet to use that record as input. Espescially in high privacy cases, this
allows the user's records to stay provide.

#### Record Requests

At any input position that requires a record, the user can specify a record Request ([§5](#5-the-permission-model).) 
to allow the target wallet to provide a record without your dapp ever being able to perceive it.

#### Algorithm Access

Each wallet supports a list algorithms it can run to compute an input at a specific (program, function, input position)
tuple. This grant allows a dapp to specify which (program, function, input position) tuples the algorithms can be run 
at.

### Connecting, reading state, and transacting

```tsx
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Network } from '@provablehq/aleo-types';

function Demo() {
  const { wallets, selectWallet, connect, disconnect, connected, connecting, address, executeTransaction } =
    useWallet();

  async function handleConnect() {
    selectWallet(wallets[0].adapter.name); // choose a wallet by its name
    await connect(Network.TESTNET);
  }

  async function send() {
    const result = await executeTransaction({
      program: 'credits.aleo',
      function: 'transfer_public',
      inputs: ['aleo1...recipient', '100u64'], // plain literal inputs
      fee: 0.01,
    });
    console.log('submitted', result?.transactionId);
  }

  if (!connected) {
    return <button onClick={handleConnect} disabled={connecting}>Connect</button>;
  }

  return (
    <>
      <span>{address}</span>
      <button onClick={send}>Send</button>
      <button onClick={() => disconnect()}>Disconnect</button>
    </>
  );
}
```

If you would rather not build your own wallet picker, the `@provablehq/aleo-wallet-adaptor-react-ui`
package provides drop-in UI components such as `WalletModalProvider` and `WalletMultiButton`.

---

## 3. The `useWallet` hook

Calling `useWallet()` returns a `WalletContextState` object that exposes the adapter's full
dapp-facing surface.

```ts
interface WalletContextState {
  // Wallet selection and connection state
  wallets: Wallet[];          // the available adapters, each shaped as { adapter, readyState }
  wallet: Wallet | null;      // the currently selected and connected wallet
  address: string | null;     // the active address, or null (also null when readAddress is false)
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  reconnecting: boolean;      // true while re-authorizing after an account-change event
  network: Network | null;
  autoConnect: boolean;

  // Lifecycle
  selectWallet(name: WalletName): void;
  connect(network: Network): Promise<void>;
  disconnect(): Promise<void>;
  switchNetwork(network: Network): Promise<boolean>;

  // Transactions
  executeTransaction(options: TransactionOptions): Promise<{ transactionId: string } | undefined>;
  transactionStatus(transactionId: string): Promise<TransactionStatusResponse>;
  executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }>;

  // Cryptography
  signMessage(message: Uint8Array | string): Promise<Uint8Array | undefined>;
  decrypt(cipherText: string): Promise<string>;

  // Data access
  requestRecords(
    program: string,
    includePlaintext?: boolean,
    statusFilter?: 'all' | 'spent' | 'unspent',
  ): Promise<unknown[]>;
  transitionViewKeys(transactionId: string): Promise<string[]>;
  requestTransactionHistory(program: string): Promise<TxHistoryResult>;

  // Capability discovery (does not require a connection)
  algorithmsSupported(): Promise<string[]>;
}
```

The shape passed to `executeTransaction` is `TransactionOptions`, from `@provablehq/aleo-types`.

```ts
interface TransactionOptions {
  program: string;
  function: string;
  inputs: TransactionInput[];   // an array of (string | InputRequest); see §8
  fee?: number;
  privateFee?: boolean;
  recordIndices?: number[];
  imports?: string[];           // dynamic-dispatch program imports
}
```

Each entry in `wallets` is a `Wallet`, which pairs an adapter with a `readyState`. The `readyState`
is a `WalletReadyState`, one of `'Installed'`, `'NotDetected'`, `'Loadable'`, or `'Unsupported'`. You
can use it to order or disable wallets in your UI; for example, you might list installed wallets
first.

---

## 4. Advanced Wallet capabilities: Shield versus the others

Every privacy feature described in this guide — permission grants, wallet-specified `InputRequest`
slots, record envelopes that carry a `uid` and a `recordView`, and derived inputs — is currently
implemented only by the Shield wallet (`@provablehq/aleo-wallet-adaptor-shield`). The remaining
adapters (Leo, Puzzle, Fox, and Soter) can connect and transact with literal inputs, but they reject
the privacy options.

| Capability | Shield | Leo, Puzzle, Fox, and Soter |
|---|---|---|
| Connect, sign, and `executeTransaction` with literal inputs | Yes | Yes |
| `decrypt` | Yes | Yes |
| `readAddress: false` (withholding the address) | Yes | No; rejected at connect time |
| `recordAccess` grant (per-field record narrowing) | Yes | No; rejected at connect time |
| `algorithmsAllowed` grant | Yes | No; rejected at connect time |
| `InputRequest` slots of `type: "record"` (by `uid` or `filters`) | Yes | No; rejected at execute time |
| `InputRequest` slots of `type: "derived"` | Yes | No; rejected at execute time |
| `RecordEnvelope` with `uid` and `recordView` | Yes | No; raw records are returned instead |
| `algorithmsSupported()` | Returns the catalog | Returns an empty array |
| `transitionViewKeys` | Yes | No; not implemented |
| `requestTransactionHistory` | Yes | No; not implemented |

When a wallet does not support a privacy feature, it tells you so explicitly rather than failing
silently, which lets you handle the case as described in [§11](#11-handling-failures). Specifically:

- If you pass `readAddress: false`, a `recordAccess` grant, or a non-empty `algorithmsAllowed` to a
  wallet that does not support them, `connect()` throws `WalletConnectOptionsNotSupportedError`.
- If you pass an `InputRequest` object (anything other than a literal string) in `inputs`,
  `executeTransaction()` throws `WalletInputRequestNotSupportedError`.
- Because `algorithmsSupported()` returns an empty array on these wallets, you can detect the absence
  of derived-input support before you even build a form.

Two of the wallets are also network-constrained: Fox and Soter only support `MAINNET`.

In concrete terms, Shield is the wallet that lets a dapp run a transaction while learning strictly
less than the full record set. It can withhold the user's address from the dapp entirely
(`readAddress: false`), expose only the record fields the dapp names (`recordAccess`), let the user's
wallet rather than the dapp choose which record fills an input slot (`type: "record"`), and compute
private cryptographic values inside the wallet that the dapp never observes (`type: "derived"`). With
the other wallets, the dapp sees decrypted records and the user's address exactly as it does today;
the narrowing is simply not available.

---

## 5. The permission model

A connection is parameterized by five values, all of which are set as provider props and bound when
the wallet connects.

| Field | Type | Default | Effect |
|---|---|---|---|
| `decryptPermission` | `DecryptPermission` | `NoDecrypt` | Determines how much decryption the dapp may do (see [§2](#2-basics-connecting-and-transacting)). |
| `programs` | `string[]` | — | The programs the dapp may interact with, and the broad record-access allowlist when `recordAccess` is omitted. |
| `readAddress` | `boolean` | `true` | When `false`, the dapp transacts without learning the active address. |
| `recordAccess` | `RecordAccessGrant` | `undefined`, meaning broad | Narrows record reads by program, by record, and by field. |
| `algorithmsAllowed` | `AlgorithmGrant[]` | `undefined`, meaning none | An opt-in allowlist for `type: "derived"` inputs. |

### `recordAccess`

The `recordAccess` grant is a nested structure that narrows which records, and which fields within
those records, the dapp may read.

```ts
type RecordAccessGrant =
  | { level: 'none' }                                  // refuse all record operations
  | { level: 'byProgram'; programs: ProgramGrant[] };  // narrow per program

interface ProgramGrant {
  program: string;
  records?: RecordGrant[];   // when omitted, all records of the program are permitted
}

interface RecordGrant {
  recordname: string;
  fields?: FieldGrant[];     // when omitted, all fields are visible; when [], usable for uid pinning only
}

interface FieldGrant {
  name: string;              // a body field such as "microcredits" or "data.amount", or a $-prefixed metadata token
  readAccess?: boolean;      // when false, the field is usable as a filter key but its plaintext is withheld
}
```

The grant resolves according to the following rules.

- When `recordAccess` is omitted, the wallet falls back to the broad behavior across the `programs`
  allowlist.
- A grant of `{ level: 'none' }` refuses all record operations.
- When `ProgramGrant.records` is omitted, every record of that program is permitted; when it is
  present, only the records you list are permitted.
- When `RecordGrant.fields` is omitted, every field is visible. An empty array makes the record
  usable for `uid` pinning while exposing no plaintext at all, and a populated array exposes only the
  fields you list.
- Setting `FieldGrant.readAccess` to `false` lets the field be used as a filter key while withholding
  its plaintext.
- A `FieldGrant.name` may be either a record-body field name or one of the `$`-prefixed
  envelope-metadata tokens: `$commitment`, `$tag`, `$transitionId`, `$transactionId`, `$outputIndex`,
  `$transactionIndex`, `$transitionIndex`, `$owner`, and `$sender`.

The following example exposes only the `microcredits` field of `credits.aleo/credits`, and opts back
into the record's commitment metadata.

```tsx
<AleoWalletProvider
  wallets={wallets}
  network={Network.TESTNET}
  decryptPermission={DecryptPermission.NoDecrypt}
  programs={['credits.aleo']}
  recordAccess={{
    level: 'byProgram',
    programs: [
      {
        program: 'credits.aleo',
        records: [
          {
            recordname: 'credits',
            fields: [
              { name: 'microcredits' },   // expose this body field
              { name: '$commitment' },    // opt back into the commitment metadata
            ],
          },
        ],
      },
    ],
  }}
>
  {children}
</AleoWalletProvider>
```

### `readAddress: false`

Setting `readAddress` to `false` withholds the active address from the dapp. The wallet enforces a
few constraints on such a connection.

- The `decryptPermission` must be `NoDecrypt`, otherwise the connection is rejected.
- The grant may not include any of `$owner`, `$sender`, `$commitment`, `$tag`, `$transitionId`, or
  `$transactionId`, because each of those would re-leak the address.
- The methods `decrypt`, `requestRecords` with `includePlaintext: true`, `transitionViewKeys`, and
  `requestTransactionHistory` all throw `WalletAddressWithheldError` on this connection, and
  `useWallet().address` is `null`.

### `algorithmsAllowed`

The `algorithmsAllowed` grant is a strict opt-in allowlist for derived inputs, and each entry
authorizes exactly one call site. The details of derived inputs are covered in [§9](#9-derived-inputs).

```ts
interface AlgorithmGrant {
  algorithm: string;       // must appear in the wallet's algorithmsSupported() list
  program: string;         // must also appear in the programs[] allowlist
  function: string;        // the exact transition name
  inputPosition: number;   // the 0-based index into the function's inputs
  argConstraints?: Record<string, string[] | 'any'>;  // an optional per-argument value allowlist
}
```

There is no broad default for this grant. If `algorithmsAllowed` is omitted or empty, the wallet
refuses every derived request.

---

## 6. Legacy apps and the version boundary

The privacy features in this guide are not yet part of a published release. The latest published
version, carried by the npm `latest` dist-tag, is **`0.3.0-alpha.4`**, and it does not include
permission grants, `InputRequest` slots, record envelopes, or derived inputs. The privacy features
will ship in the next release.

In other words, the legacy boundary is `0.3.0-alpha.4` and earlier. A "legacy app" is one built
against that last released version. A legacy app connects with only `network`, `decryptPermission`,
and `programs`; it passes literal-string inputs; and it reads records in their raw per-wallet shape.
None of the grant props or `InputRequest` shapes exist for it. Nothing in this guide breaks such an
app, because every privacy feature is additive and opt-in, as the migration notes in
[§12](#12-migration-cheatsheet) describe.

It is worth keeping a related distinction in mind. A "legacy wallet" is any wallet adapter, at any
version, that does not implement the privacy extension, which today means every wallet except Shield.
Code that targets the new features should therefore handle the "not supported" errors from
[§4](#4-wallet-capabilities-shield-versus-the-others) so that legacy wallets degrade gracefully
instead of crashing. Wherever this guide says "legacy", it refers to one or both of these cases: the
last released version (`0.3.0-alpha.4`) and any wallet that predates the privacy extension.

---

## 7. Reading records

When you read records from a privacy-aware wallet, `requestRecords` returns an array of
`RecordEnvelope` objects.

```ts
import type { RecordEnvelope } from '@provablehq/aleo-types';

interface RecordEnvelope {
  recordView?: { fields: Record<string, string> };  // only the fields the grant exposes
  uid?: string;                                      // an opaque pinning handle, valid for this connection
  [legacyField: string]: unknown;                    // commitment, owner, spent, and so on, when the grant allows
}

const records = (await requestRecords('credits.aleo', true, 'unspent')) as RecordEnvelope[];

for (const rec of records) {
  rec.uid;                  // an opaque handle that is stable for this connection
  rec.recordView?.fields;   // for example, { microcredits: "100u64" } — only the granted fields
  rec.recordName;           // 'credits'        (a legacy field)
  rec.programName;          // 'credits.aleo'   (a legacy field)
  rec.spent;                // a boolean        (a legacy field)
}
```

A few things are worth emphasizing. The `uid` is a wallet-issued opaque handle, not the record's
commitment, and the wallet may rotate uids across connections in order to prevent cross-session
linkability, so you should not persist them across sessions. The legacy fields such as `commitment`,
`tag`, `owner`, `sender`, and `recordPlaintext` are present only when the grant is broad enough to
expose them. Finally, non-Shield wallets ignore the envelope contract and return their raw record
objects, so you should treat `recordView` and `uid` as optional and feature-detect before relying on
them.

---

## 8. Composing transaction inputs

The `inputs` array you pass to `executeTransaction` accepts a mix of literal strings and
`InputRequest` objects.

```ts
type InputRequest =
  | { type: 'address'; label?: string }
  | { type: 'record'; program: string; recordname: string; uid: string }
  | { type: 'record'; program: string; recordname: string; filters?: RecordFilters }
  | { type: 'derived'; algorithm: string; args: Record<string, AlgorithmArg>; label?: string };
```

Each `InputRequest` variant fills its slot differently and is valid only in certain slot types.

| `InputRequest` | What it does | Valid slot types |
|---|---|---|
| `{ type: 'address' }` | The wallet injects the active address. | `address`, `group`, `scalar`, `field` |
| `{ type: 'record', …, uid }` | The wallet pins a specific record by its `uid` handle. | `record`, `dynamic_record`, `external_record` |
| `{ type: 'record', …, filters }` | The wallet auto-selects a matching unspent record. | The same as above. |
| `{ type: 'derived', algorithm, args }` | The wallet computes a value with a named algorithm. | Depends on the algorithm. |

The following call mixes a pinned record, an injected address, and a literal value.

```ts
await executeTransaction({
  program: 'credits.aleo',
  function: 'transfer_private',
  inputs: [
    { type: 'record', program: 'credits.aleo', recordname: 'credits', uid: chosen.uid! }, // pin by uid
    { type: 'address' },                                                                   // active address
    '100u64',                                                                              // literal
  ],
});
```

### Choosing the right `type: "record"` shape

A few rules govern the record request shapes. Both `program` and `recordname` are always required,
because every `type: "record"` slot names the record type as `program/recordname`, for example
`credits.aleo/credits`. The wallet matches the request against your `recordAccess` grant on the same
`(program, recordname, field)` triple, so omitting `recordname` is a client-side validation error
that is raised before the request ever reaches the wallet.

Beyond that, choose the shape based on intent. Use the `uid` form when you have already called
`requestRecords` and want one exact record. Use the `filters` form when you want the wallet to pick
any unspent record that matches your conditions. Supplying both `uid` and `filters` is an error and
throws `WalletInputRequestInvalidError` on the client.

```ts
// Filters are AND-combined per field. The available operators are eq, neq, gte, and lte.
const filters = {
  microcredits: { gte: '100u64', lte: '1000u64' },  // a range on a body field
  'data.tier':  { eq: '2u8' },                       // a dotted path into struct fields
};

await executeTransaction({
  program: 'credits.aleo',
  function: 'transfer_private',
  inputs: [
    { type: 'record', program: 'credits.aleo', recordname: 'credits', filters },
    { type: 'address' },
    '100u64',
  ],
});
```

### Validating early

The `validateInputRequests(inputs)` helper from `@provablehq/aleo-wallet-adaptor-core` runs the same
client-side structural checks that `executeTransaction` runs, such as catching a request that carries
both `uid` and `filters`, or malformed derived `args`. Because `executeTransaction` already calls it
for you, you would typically only call it yourself while building a form, so that a
`WalletInputRequestInvalidError` surfaces before the user submits.

---

## 9. Derived inputs (`type: "derived"`)

A `type: "derived"` slot tells the wallet to compute a value by running a named cryptographic
algorithm over its own state — its view key, wallet-maintained counters, and so on — together with
the `args` you supply, and then to substitute the result. You never see the wallet-side inputs; you
see only the output.

Derived inputs are strictly opt-in through `algorithmsAllowed` at connect time. Each grant authorizes
exactly one `(algorithm, program, function, inputPosition)` call site. You can optionally pin
per-argument values with `argConstraints`, which is either a fixed allowlist of acceptable values or
the string `"any"` (and an omitted constraint means any value is allowed). Pinning the values means a
later call cannot reuse the grant with different arguments.

```ts
<AleoWalletProvider
  // ...
  algorithmsAllowed={[
    // swap_private fills two slots from the same wallet-side counter:
    { algorithm: 'program-scoped-blinding-factor',
      program: 'amm_v3.aleo', function: 'swap_private', inputPosition: 1 },
    { algorithm: 'program-scoped-blinded-address',
      program: 'amm_v3.aleo', function: 'swap_private', inputPosition: 2,
      // pin the operational args so that only an `issue` against this mapping is allowed:
      argConstraints: {
        mode: ['issue'],
        membershipMapping: ['used_blinded_addresses'],
      } },
  ]}
>
```

To discover what an adapter supports, call `useWallet().algorithmsSupported()`, which does not require
a connection. A wallet without derived-input support returns an empty array, while Shield returns
`['program-scoped-blinding-factor', 'program-scoped-blinded-address']`.

At execute time, you pass `{ type: "derived", algorithm, args }` in the matching slots. The `args`
value is a `Record<string, AlgorithmArg>`, where each `AlgorithmArg` is `{ type, value }` — both are
strings, and `type` is an Aleo literal type such as `'address'` or `'field'`, or else `'string'`.
Each algorithm documents the keys it consumes. The two blinding algorithms take the same arguments
apart from the per-slot algorithm name:

- `mode` selects the operation. A value of `"issue"` advances the wallet's counter for a new swap,
  while `"resolve"` reuses a past counter that is selected by the public `targetAddress` for a claim.
  The counter never leaves the wallet.
- `membershipProgram` and `membershipMapping` tell the wallet where to probe the used-address state.
- `targetAddress` is supplied only when resolving.

```ts
await executeTransaction({
  program: 'amm_v3.aleo',
  function: 'swap_private',
  inputs: [
    // ...the token_in_record slot...
    { type: 'derived',
      algorithm: 'program-scoped-blinding-factor',  // produces a private blinding_factor
      args: {
        mode: { type: 'string', value: 'issue' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
      },
    },
    { type: 'derived',
      algorithm: 'program-scoped-blinded-address',   // produces a public blinded_address
      args: {
        mode: { type: 'string', value: 'issue' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
      },
    },
    // ...the rest of the function's inputs
  ],
});
```

### Claiming a past swap with `mode: "resolve"`

The swap above ran in `mode: "issue"`, so the wallet picked the next free counter and advanced it. To
later claim that swap's output through `claim_swap_output_private`, you run the same two algorithms in
`mode: "resolve"`. Rather than advancing the counter, the wallet re-derives the counter of the
existing swap by inverting its public blinded address, and then reproduces the matching
`(blinding_factor, blinded_address)` pair. As before, the counter never leaves the wallet.

The claim call differs from the issue call in only two respects: `mode` becomes `"resolve"`, and you
add `targetAddress`, which is the public blinded address of the swap you are claiming. That is the
value the issue call's `program-scoped-blinded-address` slot produced, and the value the contract
recorded in `used_blinded_addresses`. Both slots must carry the same `targetAddress`, or the wallet
rejects the call before deriving anything.

```ts
const targetAddress = 'aleo1…'; // the public blinded address of the swap being claimed

await executeTransaction({
  program: 'amm_v3.aleo',
  function: 'claim_swap_output_private',
  inputs: [
    { type: 'derived',
      algorithm: 'program-scoped-blinding-factor',  // the private blinding_factor of the past swap
      args: {
        mode: { type: 'string', value: 'resolve' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
        targetAddress: { type: 'address', value: targetAddress },
      },
    },
    { type: 'derived',
      algorithm: 'program-scoped-blinded-address',   // the same public blinded_address
      args: {
        mode: { type: 'string', value: 'resolve' },
        membershipProgram: { type: 'string', value: 'amm_v3.aleo' },
        membershipMapping: { type: 'string', value: 'used_blinded_addresses' },
        targetAddress: { type: 'address', value: targetAddress },
      },
    },
    // ...the rest of the function's inputs
  ],
});
```

If you pinned operational arguments with `argConstraints` at connect time, remember that the
`resolve` call sites need their own grants. A grant whose `argConstraints.mode` is `['issue']` will
refuse this call, so you should grant `mode: ['issue', 'resolve']` (or omit the `mode` constraint
entirely). In any case, `claim_swap_output_private` is a different function than `swap_private`, so it
needs grants of its own regardless.

To render correct forms or to validate shapes ahead of time, use `ALGORITHM_SCHEMAS` from
`@provablehq/aleo-types`, which ships each algorithm's argument schema (including each argument's type
and any `possibleValues` or `optional` markers), its output type, and its valid slot positions.

```ts
import { ALGORITHM_SCHEMAS } from '@provablehq/aleo-types';

ALGORITHM_SCHEMAS['program-scoped-blinding-factor'];
// {
//   args: {
//     mode: { type: 'string', possibleValues: ['issue', 'resolve'] },
//     membershipProgram: { type: 'string' },
//     membershipMapping: { type: 'string' },
//     targetAddress: { type: 'address', optional: true },
//   },
//   outputType: 'field',
//   validSlotTypes: ['field', 'scalar', 'group'],
// }
```

---

## 10. Building privacy-preserving dapps

The default connection — with `recordAccess` omitted, `readAddress` left at `true`, and a broad
`programs` allowlist — gives the dapp the same visibility it has always had, namely decrypted records
and the user's address. Privacy is opt-in, and the dapp is the party that opts in. The following
guidance is in rough order of impact.

First, request the narrowest grant that still lets the feature work. There is no reason to ask for
broad record access if you only need one field. Set `recordAccess.level` to `'byProgram'` and list
exactly the records and fields you read. Anything you do not list stays invisible to your dapp, which
means it cannot be leaked, logged, or subpoenaed out of you.

Second, use per-field grants for anything you only display. If you show a balance, grant
`{ name: 'microcredits' }` and nothing more, so that the user's other record fields never reach your
frontend. For a display-heavy dapp, this is the single highest-leverage habit.

Third, prefer `type: "record"` requests over the pattern of reading records and then pinning them.
When a function needs, say, some unspent `credits` record of at least 100, send
`{ type: 'record', program, recordname, filters }` and let the wallet choose. The dapp then never
calls `requestRecords`, never sees plaintext, and never holds a list of records. Reserve pinning by
`uid` for cases where the user must choose a specific record in your UI, and even then, grant
`fields: []` so that the record can be pinned while exposing no plaintext.

Fourth, withhold the address whenever you do not need it. If a flow never needs to know who the user
is — for instance, a fully private transfer composed from `type: "record"` and `type: "address"`
slots — connect with `readAddress: false` and `decryptPermission: NoDecrypt`. The wallet still
injects the address into the transaction without ever revealing it to your code.

Fifth, keep `argConstraints` tight on derived inputs. Pin values such as `mode` and
`membershipMapping` to exactly what your dapp uses, so that a compromised frontend cannot repurpose
the grant for a different operation.

Finally, do not persist `uid`s across sessions. They are connection-scoped opaque handles that the
wallet may rotate specifically in order to break cross-session linkability, and persisting them
defeats that protection.

It helps to treat each grant prop as a budget you are spending against the user's privacy: the less
you request, the less your dapp can ever lose control of.

---

## 11. Handling failures

### Error classes

Every error below is imported from `@provablehq/aleo-wallet-adaptor-core`. They all subclass
`WalletError`, and each sets a distinct `name` that you can switch on.

| Error | When it is thrown |
|---|---|
| `WalletNotConnectedError` | A connection-required method, such as `executeTransaction` or `requestRecords`, is called with no active connection. |
| `WalletNotSelectedError` | `connect()` is called before `selectWallet()`. |
| `WalletNotReadyError` | The selected wallet is not installed, or it is still initializing. |
| `WalletConnectionError` | The connection failed; this also covers `readAddress: false` paired with a permission other than `NoDecrypt`. |
| `WalletDisconnectionError` | The disconnect failed. |
| `WalletTransactionRejectedError` | The user rejected the transaction in the wallet UI. |
| `WalletTransactionTimeoutError` | The transaction timed out while waiting for confirmation. |
| `WalletTransactionError` | The transaction failed for another reason; this is the base class for the two errors above. |
| `WalletDecryptionNotAllowedError` | `decrypt` was called while the permission is `NoDecrypt`. |
| `WalletDecryptionError` | Decryption failed for another reason. |
| `WalletSignMessageError` | Message signing failed. |
| `WalletSwitchNetworkError` | The network switch failed. |
| `WalletInputRequestInvalidError` | An `InputRequest` is malformed, for example carrying both `uid` and `filters`. This is raised on the client, before the wallet. |
| `WalletInputRequestNotSupportedError` | The wallet does not support `InputRequest` slots, so you must pass literals (this is a legacy wallet). |
| `WalletConnectOptionsNotSupportedError` | The wallet does not support the privacy connect options (this is a legacy wallet). |
| `WalletAddressWithheldError` | An address-revealing method was called on a `readAddress: false` connection. |
| `WalletFeatureNotAvailableError` | The wallet does not implement a feature, such as `transitionViewKeys` on a non-Shield wallet. |
| `MethodNotImplementedError` | The adapter has not implemented the method at all. |

### Patterns

It is usually better to detect capabilities up front than to catch errors after the fact, because
doing so keeps a legacy wallet from ever reaching a feature it cannot support.

```tsx
const { algorithmsSupported } = useWallet();
const [canDerive, setCanDerive] = useState(false);

useEffect(() => {
  algorithmsSupported().then((algos) => setCanDerive(algos.length > 0));
}, [algorithmsSupported]);

// Only render the derived-input form when canDerive is true.
```

When you do handle errors, centralize them through `onError` and branch on the error's `name` wherever
the experience should differ.

```tsx
<AleoWalletProvider
  // ...
  onError={(err) => {
    switch (err.name) {
      case 'WalletTransactionRejectedError':
        return; // the user cancelled, so usually no toast is needed
      case 'WalletConnectOptionsNotSupportedError':
      case 'WalletInputRequestNotSupportedError':
        toast.info('This wallet does not support the privacy features. Try Shield.');
        return;
      case 'WalletAddressWithheldError':
        toast.error('This action needs your address. Reconnect with address sharing enabled.');
        return;
      default:
        toast.error(err.message);
    }
  }}
>
```

When you support a feature that only Shield implements, you can let legacy wallets degrade gracefully
by catching the "not supported" errors at the call site and falling back to a literal-input path.

```ts
try {
  await executeTransaction({ program, function: fn, inputs: privacyInputs });
} catch (err) {
  if (
    err.name === 'WalletInputRequestNotSupportedError' ||
    err.name === 'WalletConnectOptionsNotSupportedError'
  ) {
    await executeTransaction({ program, function: fn, inputs: literalInputs });
  } else {
    throw err;
  }
}
```

Finally, validate `InputRequest`s while you build the form, so that structural mistakes surface as a
`WalletInputRequestInvalidError` before the user clicks submit, as described in
[§8](#8-composing-transaction-inputs).

---

## 12. Migration cheatsheet

How much you need to change depends on what your existing dapp does.

- If it does not use any of the privacy fields, you need to change nothing. The provider's new props
  default to `undefined` or to broad behavior, and your existing calls work identically.
- If it reads records through `requestRecords`, the return shape is unchanged as long as no grant is
  set. The `recordView` and `uid` fields are additive and optional, so you can ignore them until you
  adopt grants.
- If it composes `inputs` as plain strings, keep doing exactly that. The `InputRequest` shapes are
  opt-in on a per-slot basis.
- If you want to adopt narrowed grants, populate `recordAccess` at the provider level. You can use
  `RecordGrant.fields: []` to mint records that are usable purely for `uid` pinning, with no plaintext
  exposed.
- If you want to use derived inputs, populate `algorithmsAllowed` with one grant per call site, and
  then place `{ type: 'derived', algorithm, args }` in the matching `inputs[i]`. Remember that there
  is no broad default, so an empty `algorithmsAllowed` refuses every derived request.
- If you must support wallets other than Shield, feature-detect with `algorithmsSupported()` and
  `readyState`, and handle `WalletConnectOptionsNotSupportedError` and
  `WalletInputRequestNotSupportedError` so that legacy wallets fall back to literal inputs, as shown
  in [§11](#11-handling-failures).
