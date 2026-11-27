---
'@provablehq/shield-multichain': minor
---

Introduce `@provablehq/shield-multichain` for isolated per-Aleo-account EVM and
Solana access under `window.shield.multichain`, including `getCapabilities`,
silent `getAccounts`, `requestAccount`, message/typed-data/transaction signing
and submission, namespaced relay transport, response validation, and
payload-less session invalidation. The Aleo adapter APIs are unchanged.
