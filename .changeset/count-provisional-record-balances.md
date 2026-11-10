---
'@provablehq/aleo-wallet-adapter-core': patch
---

Count Shield's provisional records in `sumRecordBalance` and the `getWalletBalances` fallback. A provisional record is the output of a transaction the network accepted that Shield's scanner has not indexed yet. Its inputs have already left the record list, so leaving it out made the private balance dip after each transaction.
