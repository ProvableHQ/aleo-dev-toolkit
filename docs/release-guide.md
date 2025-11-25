# Releasing a New Version

This repository uses [Changesets](https://github.com/changesets/changesets) and PNPM workspaces to version and publish the Aleo adaptor packages. The `pnpm publish-packages` script builds and tests the whole monorepo and then runs `changeset publish`, so a single command completes the release once a changeset is in place.

## Prerequisites

- Node.js `>=18` and PNPM `>=10` (see `package.json` engines)
- Access to the `ProvableHQ` npm organization (run `npm whoami` to confirm)
- 2FA or auth tokens configured for npm publishing
- A clean `master` branch synced with GitHub (`.changeset/config.json` expects `master`)

## 1. Prepare the Workspace

```bash
git checkout master
git pull origin master
pnpm install
pnpm build
pnpm lint
pnpm test
```

> Building/linting/testing before creating a changeset ensures you are releasing a healthy commit.

## 2. Create a Changeset

Changesets describe which packages are being released and the type of version bump (major, minor, patch).

```bash
pnpm changeset
```

1. Select every package that changed (e.g., `@provablehq/aleo-wallet-adaptor-core`, `@provablehq/aleo-wallet-adaptor-react`, each wallet implementation, etc.).
2. Choose the bump type (for version 1.0.0 releases, pick **major**).
3. Enter a short summary of the changes.

Commit the generated `.changeset/*.md` file along with any code changes:

```bash
git add .
git commit -m "Prepare release"
```

Optional: inspect what the next release will produce.

```bash
pnpm changeset status --verbose
```

## 3. Publish

When you are ready to publish the release (usually after merging the PR containing the changeset into `master`), run:

```bash
pnpm publish-packages
```

This script performs:

1. `turbo run build lint test` — builds every package, runs ESLint, and executes tests.
2. `changeset publish` — bumps versions, updates each package `CHANGELOG.md`, tags the release, and publishes to npm using the `publishConfig.access: "public"` settings in each package.

Stay logged into npm for the entire publish command; if 2FA is enabled you will be prompted at the end.

## 4. Wrap Up

```bash
git push origin master --follow-tags
```

- Verify the packages on npm (e.g., `npm view @provablehq/aleo-wallet-adaptor-core version`).
- Create a GitHub release if desired, linking the npm versions and summarizing the update.

You now have a new release of the Aleo wallet adaptor packages on npm.
