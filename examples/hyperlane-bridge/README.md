# Hyperlane testnet bridge demo

Standalone Sepolia ↔ Aleo testnet bridge app. It retains fee quoting, source-chain submission, delivery links, private claims and private burns. The adapter example separately demonstrates only address encoding.

This app uses its own dependency list, provider settings and development port. It is private, excluded from the package release build/lint gate, and its protocol/UI tests are run explicitly. Automated tests mock chain/wallet boundaries; completing the manual flow below with funded testnet wallets is the live end-to-end check.

Use a local Shield extension containing the matching private-mint support and the latest local shield-core from its feature branch. This app does not publish or release core.

## Try the testnet deposit, claim, and private burn

Run the React example:

```sh
pnpm install
pnpm bridge-app:dev
```

Open `http://localhost:5175` (the dedicated bridge app):

1. Select **Configure Hyperlane testnet permissions**, then reconnect the updated
   Shield extension and approve the grants. This switches the example to testnet.
   The wallet must support address encoding, `route-bound-commitment-secret`, and
   `program-freezelist-exclusion-proof`. An older wallet cannot fund a deposit
   through this demo. The local Shield extension build must include private-claim
   support; address encoding alone is insufficient.
2. Request an encoding. Save its exact bytes and keep the issuing wallet and
   commitment history. The encoding fills both the Sepolia deposit and Aleo claim
   forms. To recover an earlier deposit, paste its original encoding into the
   claim form; requesting another encoding creates a different identity.
3. Enter the Sepolia ETH amount (default `0.001`), select **Connect Sepolia wallet &
   quote**, and approve the EVM connection and switch to Sepolia (`11155111`).
   Review all three `transferRemote` inputs, the sender, bridge fee, and full ETH
   value. Input 1 (zero-based) is the unchanged commitment; destination is Aleo
   testnet domain `1617853565`.
4. Select **Send Sepolia ETH**, approve in your EVM wallet, and follow the receipt
   and Hyperlane delivery links. A source receipt alone does not establish delivery.
5. Enter the original encoding in the claim form. The demo automatically reads
   its `claimable` mapping entry and defaults to the **maximum claimable amount**.
   After delivery, use **Use maximum** or **Refresh balance** to refresh it. You
   can enter a smaller amount for a partial claim. Select **Review claim in wallet**.
   Use the wallet that issued
   this encoding, with its original recipient account selected. No token record
   is required for a claim. The bridge debits the exact claim amount and creates
   a private `test_arc20_eth.aleo/Token` record with that full amount.
6. To send private ETH back, enter the **Sepolia recipient** and **gross private
   token spend**, then select **Quote private burn**. Review the token fee, net
   ETH bridged, dispatch payment in microcredits, and the execution fee or
   sponsorship shown by Shield.
   Select **Approve private burn**. The wallet needs a single unspent ETH token
   record covering the gross spend and a single private credits record covering
   the dispatch payment. Change records return to the wallet. Split balances
   may need consolidation in the wallet first.

**Fee Master pays eligible Aleo execution fees when enabled in Shield.** The demo
leaves the priority fee unset so the wallet applies its fee strategy and displays
sponsorship or any user-paid fee before approval. Hyperlane's outbound dispatch
payment remains separate: it spends the quoted amount from your private ALEO
credits record, even when Fee Master sponsors execution. A freeze-listed claim
recipient or outbound signer cannot obtain a valid exclusion proof.

The fixed [Sepolia ETH router](https://github.com/hyperlane-xyz/hyperlane-registry/blob/main/deployments/warp_routes/ETH/aleotestnet-config.yaml)
is `0x7c4aAAaB1f846881af95f5736d127F3F3F07F25F`, enrolled with
`test_hyp_warp_token_eth_v2.aleo`. The destination token is `test_arc20_eth.aleo`.
The example is fixed to this deployment and rejects a changed router or decimals.

The EVM helper sums native `quoteTransferRemote` payments, which already include
the bridged principal. It rechecks fees, chain, account, Aleo wallet readiness,
and recipient, then simulates the exact call before requesting a signature.
Sepolia execution gas is additional. Save the submitted hash even when receipt
tracking times out; inspect it before making another deposit.

### Wallet grants and ABI inputs

The example configures execution access for the warp, token, and credits programs,
plus these exact derived slots:

| Transition                | Input | Wallet algorithm                     |
| ------------------------- | ----- | ------------------------------------ |
| `claim_private`           | 3     | `route-bound-commitment-secret`      |
| `claim_private`           | 4     | `program-freezelist-exclusion-proof` |
| `transfer_remote_private` | 9     | `program-freezelist-exclusion-proof` |

Both proof grants constrain `freezelistProgram` to `shield_arc22_freezelist.aleo`.
Record grants allow filtering `Token.amount` and `credits.microcredits` without
requesting their plaintext.
Permission changes disconnect the existing wallet; the user approves them on
reconnection. Readiness is scoped to wallet, account, network, and connection
settings, and is checked again after asynchronous preparation.

Claim inputs are commitment limbs, private amount, wallet address request, derived
original claim secret, and derived recipient proof. The commitment is packed as
**two little-endian u128 limbs**; its bytes are never reversed for the EVM call.
The dapp does not derive a secret or scan private records.

Private-burn inputs follow the deployed eleven-input ABI: token record, credits
record, app metadata, mailbox hook state, remote router, destination domain, EVM
recipient limbs, **gross** amount, four hook allowances, signer proof, and fee bps.
The outbound EVM recipient is left-padded to 32 bytes before packing into limbs;
it is not an inbound address commitment. The proof subject defaults to the Aleo
signer, rather than the EVM destination.

The quote reads deployed `private_transfer_fee_bps__[false]` (absent means zero),
metadata, router, mailbox, and both effective and required dispatch hooks. It
supports no-op, Merkle-tree, and gas-paymaster hooks; unknown hooks or failed reads
stop preparation. Gas-paymaster payment is
`(gas_limit + gas_overhead) * gas_price * exchange_rate / 10^10`, floored, with a
`50000` gas-limit fallback when the router specifies zero. The token fee is
`floor(gross * fee_bps / 10000)`, computed without overflowing u128. Both hook
payments count toward the credits requirement, including when the same hook runs
twice. A fresh read before submission rejects changed route or fee data.

Aleo transaction status is shown after submission. Outbound Aleo success still
requires Hyperlane delivery to Sepolia. Unknown outcomes and tracking errors do
not automatically enable another submission; check wallet activity before using
**prepare another transaction**. After a reload, inspect wallet history before
retrying. Claim preparation rechecks the current balance and pause state; the
updated Shield wallet also validates claims and refreshes their compliance proof
at confirmation. On-chain finalization validates burn metadata, fees, proofs,
and pause state.

The implementation lives in the example's
[`hyperlaneAleoTestnet.ts`](src/lib/hyperlaneAleoTestnet.ts),
[`HyperlaneAleoActions.tsx`](src/components/functions/HyperlaneAleoActions.tsx),
and [`HyperlaneRecipientPage.tsx`](src/pages/HyperlaneRecipientPage.tsx).
Bridge-specific helpers remain outside the published adapter packages and release
test gate. Run the example's ABI, fee, lifecycle, and form tests with:

```sh
pnpm --filter hyperlane-bridge-example test
```

For an independent build/typecheck:

```sh
pnpm --filter hyperlane-bridge-example build
pnpm --filter hyperlane-bridge-example typecheck
```

Shield remote pairing uses the adapter defaults. `VITE_SHIELD_RELAY_URL` and `VITE_SHIELD_DEEPLINK_BASE` override them for local testing; an empty relay URL disables remote fallback.
