### StandardWallet Interface (Work in Progress)

> **⚠️ Experimental / Work in Progress**

The `StandardWallet` interface and feature-based architecture are **experimental and work-in-progress**. They are not currently used by first-party wallet adapters in this toolkit.

**Current State:**

- First-party wallet adapters (Shield, Leo, Puzzle, Soter, Fox) extend `BaseAleoWalletAdapter` and override methods directly
- The `StandardWallet` interface exists but is not implemented by any current adapters
- The feature-based pattern (`StandardWallet.features`) is designed for future third-party wallet integration

**Future Vision:**
The `StandardWallet` interface is intended to enable:

- Automatic discovery of third-party wallets that follow the standard
- Runtime feature detection and capability inspection
- Easier integration for external wallet developers

If you're building a wallet adapter, you should currently use the direct method override pattern (see `BaseAleoWalletAdapter` in `@provablehq/aleo-wallet-adaptor-core`).

## Related packages

- `@provablehq/aleo-wallet-adaptor-core` – base adapter that implements these interfaces.
- `@provablehq/aleo-wallet-adaptor-react` – provider that exposes adapters implementing the standard.

Live demo: https://aleo-dev-toolkit-react-app.vercel.app/
