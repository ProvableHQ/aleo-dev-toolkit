# Aleo Dev Toolkit

The **Aleo Dev Toolkit** is a monorepo containing a suite of libraries and tools designed to simplify the integration of Aleo wallets and blockchain functionality into your applications. Below is the structure of the repository and a brief explanation of each component.

## Getting Started

To get started, clone the repository and install dependencies:

```bash
git clone https://github.com/provablehq/aleo-dev-toolkit.git
cd aleo-dev-toolkit
pnpm install
```

Explore the `examples/` directory for sample projects or refer to the `docs/` directory for detailed documentation.

## Build

If you build on the root, it will build all packages.

```bash
pnpm build
```

## Clean

If you build on the root, it will build all packages.

```bash
pnpm clean
```

## Development

This project uses [pnpm](https://pnpm.io/), [Turborepo](https://turbo.build/repo), and [Changesets](https://github.com/changesets/changesets) for monorepo management and package publishing.

### Working with packages

Each package is located in the `packages/` directory. You can work on them individually:

```bash
cd packages/aleo-types
pnpm dev
```

### Adding a changeset

When you're ready to publish changes, you need to create a changeset:

```bash
pnpm changeset
```

This will prompt you to select the packages that have changed and the type of version change (major, minor, patch). It will also ask for a description of the changes.

### Publishing packages

To publish packages, run:

```bash
pnpm publish-packages
```

This will:
1. Build all packages
2. Run linters and tests
3. Apply changesets to update versions
4. Publish packages to npm

## Repository Structure

```
aleo-dev-toolkit/                          (Monorepo Root)
├─ packages/
│   ├─ aleo-types/                         (Common types for Aleo)
│   │
│   ├─ aleo-wallet-standard/               (Wallet Standard Interfaces & Types)
│   │
│   ├─ aleo-wallet-adaptor-core/           (Core wallet adapter logic and utilities)
│   │
│   ├─ aleo-wallet-adaptor-leo/            (LeoWallet adapter implementation)
│   │
│   ├─ aleo-wallet-adaptor-react/          (React integration for wallet adapter)
│   │
│   ├─ aleo-wallet-adaptor-react-ui/       (UI components for wallet adapter integration)
│   │
├─ examples/                              (Example projects using the toolkit)
├─ docs/                                  (Documentation and specifications, including the Aleo Wallet Standard spec)
├─ package.json                           (Root package configuration for workspaces)
└─ README.md                              (High-level introduction and quick start)
```

### Key Components

1. **`aleo-types/`**  
    Common types for the Aleo ecosystem, including Account, Transaction, and Network.

2. **`aleo-wallet-standard/`**  
    Defines the standard interfaces and types for Aleo wallet integration, including chain constants, wallet interfaces, and feature definitions.

3. **`aleo-wallet-adaptor-core/`**  
    Provides core wallet adapter logic, including base classes, error handling, and transaction utilities.

4. **`aleo-wallet-adaptor-leo/`**  
    Implements the wallet adapter for LeoWallet, handling wallet-specific logic such as connection and transaction requests.

5. **`aleo-wallet-adaptor-react/`**  
    Offers React integration for the wallet adapter, including context providers and hooks for managing wallet state.

6. **`aleo-wallet-adaptor-react-ui/`**  
    Contains reusable UI components for wallet integration, such as connect buttons and modals.

7. **`examples/`**  
    Example projects demonstrating how to use the toolkit in real-world applications.

8. **`docs/`**  
    Documentation and specifications, including the Aleo Wallet Standard specification.