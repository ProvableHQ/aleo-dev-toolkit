# Wallet algorithm integration example

A small Vite and TypeScript app shows how to consume the standard algorithms inside a wallet. No extension scaffolding is required.

## Run

From the repository root:

```sh
pnpm install
pnpm --filter @provablehq/aleo-types build
pnpm --filter @provablehq/aleo-wallet-algorithms build
pnpm --filter wallet-algorithms-example dev
```

Open the local address printed by Vite. The app uses a public fixture scalar. Never enter a real wallet key. The SDK calculations and IndexedDB writes are real; connection approval, membership reads, submission, and settlement are simulated. The two-slot fixture is not a complete deployed swap transaction.

## Try the two paths

1. **Direct algorithms:** choose a counter and derive the factor and address. Counter zero matches the published fixture. These calls have no storage dependency.
2. **Optional lifecycle:** prepare a swap, then cancel it to release the reservation. Prepare again, simulate submission, and reload. Resume the pending transaction and report acceptance or rejection. For an accepted swap, prepare its claim using either the saved index or an empty index.

The reservation list persists in IndexedDB. Simulated accepted addresses persist separately in localStorage so cold recovery can read a membership mapping. Both are scoped to the local origin. An interrupted approval stays reserved; production wallets need their own ownership and reconciliation policy before releasing abandoned approvals.

Open **Browser checks** to run real SDK vectors, concurrent IndexedDB reservations, persistence, denied grants, preparation cleanup, and cold recovery. The checks create disposable databases and display pass/fail results.

## Read the code

| File                                         | Purpose                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| [main.ts](src/main.ts)                       | Direct calls and the lifecycle UI, including submission and settlement. |
| [wallet.ts](src/wallet.ts)                   | Validate grants and resolve both transaction slots inside one session.  |
| [fixtures.ts](src/fixtures.ts)               | Public inputs, approved fixture grants, and typed dapp requests.        |
| [simulated-chain.ts](src/simulated-chain.ts) | Explicit substitute for network membership reads.                       |
| [browser-tests.ts](src/browser-tests.ts)     | Browser compatibility checks.                                           |
| [INTEGRATION.md](INTEGRATION.md)             | Where these calls fit into an existing wallet and adapter.              |

For actual wallet connection and transaction submission, use the [Wallet Adapter Private Inputs demo](https://aleo-dev-toolkit-react-app.vercel.app/private-inputs) with Shield and a deployed Shield Swap program. Configure the deployed function's grants and complete inputs as described in the [integration overview](../../docs/wallet-hosted-algorithms-integration.md).
