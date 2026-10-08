# Wallet algorithm integration example

This example demonstrates how a wallet computes private swap inputs and keeps their counter reserved until the transaction completes. Run the Vite and TypeScript app to compare direct algorithm calls with the optional session and IndexedDB helpers.

## Run

From the repository root:

```sh
pnpm install
pnpm --filter @provablehq/aleo-types build
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter wallet-algorithms-example dev
```

Open the local address printed by Vite. The app uses a fixed public test scalar. **Never enter a real wallet key.** The SDK calculations and IndexedDB writes are real; connection approval, membership reads, submission, and settlement are simulated. The two-slot fixture is not a complete deployed swap transaction.

## Try the two paths

1. **Direct algorithms:** choose a counter and derive the factor and address. Counter zero matches the included test vector. These calls compute values without reading or writing storage.
2. **Optional lifecycle:** prepare a swap, then cancel it to release the reservation. Prepare again, simulate submission, and reload. Resume the pending transaction and report acceptance or rejection. For an accepted swap, prepare its claim using either the saved index or an empty index.

The reservation list persists in IndexedDB. Simulated accepted addresses persist separately in localStorage so cold recovery can read a membership mapping. Both belong to the local browser origin. An interrupted approval stays reserved. Before releasing it, a production wallet must establish that no active request still owns it.

Open **Run browser compatibility checks** to verify SDK outputs, competing IndexedDB reservations, saved state, denied permissions, cleanup after preparation fails, and recovery without saved counters. The checks create disposable databases and display pass/fail results.

## Read the code

| File                                         | Purpose                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| [main.ts](src/main.ts)                       | Direct calls and the lifecycle UI, including submission and settlement. |
| [wallet.ts](src/wallet.ts)                   | Validate grants and resolve both transaction slots inside one session.  |
| [fixtures.ts](src/fixtures.ts)               | Public inputs, approved fixture grants, and typed dapp requests.        |
| [simulated-chain.ts](src/simulated-chain.ts) | Simulated mapping of addresses already used by swaps.                   |
| [browser-tests.ts](src/browser-tests.ts)     | Browser compatibility checks.                                           |
| [INTEGRATION.md](INTEGRATION.md)             | Where these calls fit into an existing wallet and adapter.              |

For actual wallet connection and transaction submission, use the [Wallet Adapter Private Inputs demo](https://aleo-dev-toolkit-react-app.vercel.app/private-inputs) with Shield and a deployed private swap program that uses blinded addresses. Configure the deployed function's grants and complete inputs as described in the [integration overview](../../docs/wallet-hosted-algorithms-integration.md).
