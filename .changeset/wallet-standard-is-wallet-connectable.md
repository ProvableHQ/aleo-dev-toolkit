---
'@provablehq/aleo-wallet-standard': patch
---

Add `isWalletConnectable(state)` next to `WalletReadyState` — the single source of truth for "the user can connect right now" (`INSTALLED` or `LOADABLE`, as opposed to `NOT_DETECTED` needing an install and `UNSUPPORTED` never working). Used by the wallet modal's connectable grouping and both `WalletProvider` readiness checks in place of hand-rolled comparisons.
