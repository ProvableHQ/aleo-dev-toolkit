# Contributing to Aleo Dev Toolkit

Thank you for your interest in contributing to the Aleo Dev Toolkit! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)
- [Questions and Support](#questions-and-support)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, considerate, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 10.0.0
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aleo-dev-toolkit.git
   cd aleo-dev-toolkit
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ProvableHQ/aleo-dev-toolkit.git
   ```

## Development Setup

### Install Dependencies

```bash
pnpm install
```

### Build the Project

Build all packages:

```bash
pnpm build
```

### Run Examples

To see the toolkit in action, you can run the example applications:

```bash
# Run both examples simultaneously
pnpm examples:dev

# Or run individually
pnpm adapter-app:dev    # Wallet adapter example
pnpm hooks-app:dev      # Hooks example
```

### Development Mode

To work on a specific package with watch mode:

```bash
cd packages/aleo-wallet-adaptor/core
pnpm dev
```

## Project Structure

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo).

```
aleo-dev-toolkit/
├── packages/                    # All packages
│   ├── aleo-types/             # Common Aleo types
│   ├── aleo-hooks/             # React hooks for chain data
│   ├── aleo-wallet-standard/   # Wallet standard interfaces & types
│   └── aleo-wallet-adaptor/    # Wallet adapter package
│       ├── core/               # Core adapter logic
│       ├── react/              # React integration
│       ├── react-ui/           # UI components
│       └── wallets/            # Wallet implementations
│           ├── leo/
│           ├── puzzle/
│           ├── shield/
│           ├── fox/
│           └── soter/
├── examples/                   # Example applications
├── docs/                       # Documentation
└── .changeset/                 # Changeset configuration
```

For more details, see the [README.md](README.md).

## Development Workflow

### 1. Create a Branch

Create a new branch from `master`:

```bash
git checkout master
git pull upstream master
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/add-new-wallet` - New features
- `fix/wallet-connection-bug` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/improve-error-handling` - Refactoring

### 2. Make Changes

- Write clean, maintainable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed
- Add tests for new functionality

### 3. Test Your Changes

Before submitting, ensure:

```bash
# Build all packages
pnpm build

# Run linters
pnpm lint

# Run tests (if available)
pnpm test

# Format code
pnpm format
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```
feat: add support for new wallet adapter

- Implement connection logic
- Add error handling
- Update documentation
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style and Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow existing patterns in the codebase

### Formatting

We use [Prettier](https://prettier.io/) for code formatting:

```bash
pnpm format
```

Prettier will automatically format all TypeScript, TypeScript React, and Markdown files.

### Linting

We use [ESLint](https://eslint.org/) for code linting:

```bash
pnpm lint
```

### Code Organization

- Keep files focused and single-purpose
- Use meaningful variable and function names
- Group related functionality together
- Export only what's necessary from modules

### Documentation

- Add JSDoc comments for public APIs
- Update README files when adding features
- Include code examples in documentation
- Keep inline comments concise and meaningful

## Testing

While comprehensive test coverage is a goal, currently the project focuses on manual testing through examples. When adding new features:

1. Test manually using the example applications
2. Verify edge cases and error handling
3. Test across different wallet implementations
4. Ensure backward compatibility

If you add tests, place them in a `__tests__` or `test` directory within the package.

## Submitting Changes

### 1. Create a Changeset

This project uses [Changesets](https://github.com/changesets/changesets) for version management. When your changes affect a published package, create a changeset:

```bash
pnpm changeset
```

This will:
1. Prompt you to select which packages changed
2. Ask for the type of change (major, minor, patch)
3. Request a description of the changes

A changeset file will be created in `.changeset/`. Commit this file with your changes.

### 2. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 3. Create a Pull Request

1. Go to the repository on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template:
   - **Description**: What changes does this PR make and why?
   - **Type**: Feature, Bug Fix, Documentation, etc.
   - **Testing**: How was this tested?
   - **Checklist**: Ensure all items are completed

### 4. PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Keep your branch up to date with `master`:
  ```bash
  git checkout master
  git pull upstream master
  git checkout feature/your-feature-name
  git rebase master
  ```

### 5. After Approval

Once approved, a maintainer will merge your PR. Thank you for contributing!

## Release Process

Releases are managed by maintainers using Changesets. For details on the release process, see [docs/release-guide.md](docs/release-guide.md).

**Note**: Only maintainers can publish packages to npm. Contributors should focus on code changes and creating changesets.

## Questions and Support

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Documentation**: Check the README files in individual packages

## Areas for Contribution

We welcome contributions in many areas:

- **New Wallet Adapters**: Implement adapters for additional Aleo wallets
- **Bug Fixes**: Fix issues reported in GitHub Issues
- **Documentation**: Improve README files, add examples, write guides
- **Type Definitions**: Enhance TypeScript types and interfaces
- **Examples**: Create new example applications
- **Performance**: Optimize existing code
- **Testing**: Add test coverage
- **UI Components**: Enhance or create new React UI components

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (GPL-3.0-or-later). See [LICENSE](LICENSE) for details.

---

Thank you for contributing to the Aleo Dev Toolkit! 🎉

