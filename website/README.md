# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## README Sync

Documentation is automatically synced from package READMEs using the `sync-readme.js` script. This script:

- Copies README content from packages to the `docs/` directory
- Transforms image paths to GitHub raw URLs
- Adds Docusaurus frontmatter

**Important Note on Images**: Images in the documentation are linked directly to GitHub using raw URLs. This means:

- ✅ Images will display correctly once the code is pushed and deployed to GitHub
- ⚠️ Images will **not** display in local previews if the changes haven't been pushed to GitHub yet
- To see images locally, ensure your changes are committed and pushed to the repository

The sync script runs automatically before `yarn start` and `yarn build`.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
