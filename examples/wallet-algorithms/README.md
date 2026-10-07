# Wallet private inputs lab

Three checks for an embedded wallet, then an optional counter-store sample.

1. ARC-22 record shape and input order.
2. ARC-22 compliance proof at depth 16.
3. Shield Swap blinding factor and blinded address, checked against the Shield oracle.

The guide is [docs/wallet-private-inputs.md](../../docs/wallet-private-inputs.md). Agents scaffolding a wallet should follow [packages/aleo-wallet-algorithms/AGENTS.md](../../packages/aleo-wallet-algorithms/AGENTS.md).

## Run

From the repository root:

```sh
pnpm install
pnpm wallet-algorithms:dev
```

Open the URL Vite prints. Use a public fixture only. Do not enter a real view key.

`matchesSyntheticVector`, `matchesShieldOracle`, and `stableWhenAddressesAreReordered` should be true.

The last section reserves a counter in IndexedDB and simulates submission. That store is a sample. It is not Shield's database, and it is not required to pass the three checks.
