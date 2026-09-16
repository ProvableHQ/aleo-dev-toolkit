# Releasing a New Version

This repository uses [Changesets](https://github.com/changesets/changesets) and
pnpm workspaces. Versioning and publishing are separate steps:
`changeset version` consumes pending changesets and updates versions and
changelogs; `changeset publish` publishes versions not yet on npm.

## Prerequisites

- Node.js `>=20` for the documentation site and pnpm `10.18.2` (the pinned package manager).
- Publish access to the `@provablehq` npm scope, including permission to create new packages.
- npm authentication and any required 2FA configured (`npm whoami`).
- A reviewed release commit on `master`, synced with GitHub.

## 1. Collect every pending change

```bash
pnpm install --frozen-lockfile
pnpm changeset status
```

For changes without a changeset, run `pnpm changeset`, select the affected
packages, choose the appropriate bump, and describe the change. Compare package
source changes against the last release as well, so missing changesets do not
leave features unreleased. Do not restrict the release to the renamed adapters.

## 2. Apply versions and changelogs

```bash
pnpm version-packages
pnpm install --lockfile-only
```

Review the updated manifests and changelogs and commit them along with the
lockfile. Apply versioning once per release; already-consumed changesets do not
need to be recreated.

For the `adaptor` → `adapter` migration, the prepared release contains:

| Packages                                               | Version |
| ------------------------------------------------------ | ------- |
| All eight `@provablehq/aleo-wallet-adapter-*` packages | `1.1.0` |
| `@provablehq/aleo-wallet-standard`                     | `1.2.0` |
| `@provablehq/aleo-hooks`                               | `1.0.2` |

`@provablehq/aleo-types@1.0.1` is already published and has no pending source
changes. The eleven pending feature/fix changesets are included in this release,
including the Shield remote pairing and metadata features. Old changelog
entries retain the historical `adaptor` package names.

## 3. Validate and publish

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test:release
pnpm --filter react-app-example build
pnpm --filter react-app-example-hooks build
pnpm deprecate-adaptors --dry-run
```

The root build includes the documentation site. The repository does not
currently have a working root test command; several package test scripts refer
to Jest without declaring it. Run any feature-specific checks applicable to the
release and resolve build/lint failures before publishing.

From the reviewed, versioned release commit:

```bash
pnpm publish-packages
```

This runs the release-script tests, `turbo run build lint`, and then
`changeset publish`. It does **not**
apply pending changesets. Changesets publishes every unpublished local public
package version, including new package names and dependency-only releases, and
creates local git tags. If publication is interrupted, rerun after correcting
the cause; already-published versions are skipped.

## 4. Deprecate the old names after publication

Once the entire release is published:

```bash
pnpm deprecate-adaptors --execute
```

The script first checks the exact local versions of all eight replacement
packages and their public workspace dependencies on the npm registry. If any
are unavailable, it exits before deprecating anything. It then runs the
following operation for each old name, with a package-specific message and
migration-guide link:

```bash
npm deprecate '@provablehq/aleo-wallet-adaptor-core@*' 'Renamed to @provablehq/aleo-wallet-adapter-core. Install the replacement and update your imports.'
```

The wildcard includes historical prereleases. Deprecation adds an install
warning; it does not unpublish existing versions or redirect imports. No new
versions are published under the old names. See the
[npm deprecate reference](https://docs.npmjs.com/cli/v11/commands/npm-deprecate/).

The script defaults to a preview when run without arguments. If a deprecation
fails partway through (for example, a 2FA challenge), fix the cause and rerun it;
reapplying the same notice is safe. An incorrect notice can be removed with
`npm deprecate '<old-package>@*' ''`.

## 5. Wrap up

```bash
git push origin master --follow-tags
npm view @provablehq/aleo-wallet-adapter-core version
npm view @provablehq/aleo-wallet-adaptor-core deprecated
```

Publish the updated documentation with the
[migration guide](migrating-to-adapter.md), and link it from the release notes.
Verify that the notes cover the pending features as well as the package rename.
