#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repo = 'ProvableHQ/aleo-dev-toolkit';
const branch = 'master';

// READMEs synced from packages/<sourcePackage>/README.md
const readmeConfigs = [
  {
    sourcePackage: 'aleo-wallet-adapter',
    targetDoc: 'wallet-adapter.md',
    title: 'Aleo Wallet Adapter',
    hasImages: true,
  },
  {
    sourcePackage: 'aleo-wallet-adapter/wallets/shield',
    targetDoc: 'wallets/shield.md',
    title: 'Shield Wallet Adapter',
    hasImages: false,
  },
];

// Docs synced from the repo-root docs/ directory
const rootDocConfigs = [
  {
    sourceFile: 'migrating-to-adapter.md',
    targetDoc: 'migrating-to-adapter.md',
    title: 'Migrating to Adapter',
  },
  {
    sourceFile: 'privacy-preserving-dapps.md',
    targetDoc: 'privacy-preserving-dapps.md',
    title: 'Privacy-Preserving Dapps',
  },
];

/**
 * Transforms ./docs/images/ paths to GitHub raw URLs.
 */
function transformImagePaths(content, packagePath) {
  if (!packagePath) return content;
  const base = `https://raw.githubusercontent.com/${repo}/${branch}/packages/${packagePath}/docs/images`;
  content = content.replace(/\]\(\.\/docs\/images\/([^)]+)\)/g, `](${base}/$1)`);
  content = content.replace(/\]\(docs\/images\/([^)]+)\)/g, `](${base}/$1)`);
  return content;
}

/**
 * Transforms relative repo paths to GitHub blob URLs so they resolve on the
 * Docusaurus website (those files are not Docusaurus docs).
 *
 * `../` links are treated as escaping toward the repo root (e.g. the
 * quickstart's `../../examples/react-app/...`). `./` links are relative to
 * `sourceDir` (the README's package, or `docs/` for root docs).
 */
function transformRepoLinks(content, sourceDir) {
  const base = `https://github.com/${repo}/blob/${branch}`;
  // Package README → Docusaurus doc (must run before the generic ./ rewrite).
  content = content.replace(
    /\]\(\.\/wallets\/shield\/README\.md\)/g,
    '](./wallets/shield)',
  );
  // Root / nested docs that already exist on this site.
  content = content.replace(/\]\((?:\.\.\/)+docs\/([^)]+?)\.md\)/g, (_match, doc) => {
    return `](/docs/${doc})`;
  });
  content = content.replace(/\]\((\.\.[^)]+)\)/g, (_match, href) => {
    const normalized = href.replace(/^(\.\.\/)+/, '');
    return `](${base}/${normalized})`;
  });
  if (sourceDir) {
    // Only rewrite file paths (README.md, images). Leave Docusaurus doc ids
    // such as ./wallets/shield alone.
    content = content.replace(/\]\(\.\/([^)]+\.[^)]+)\)/g, (_match, href) => {
      return `](${base}/${sourceDir}/${href})`;
    });
  }
  return content;
}

function assertNoBrokenLocalDocLinks(targetPath, content) {
  const leftover = [...content.matchAll(/\]\((\.[^)]+)\)/g)]
    .map((match) => match[1])
    .filter((href) => {
      if (href.startsWith('./wallets/shield')) return false;
      if (href.startsWith('http://') || href.startsWith('https://')) return false;
      return href.endsWith('.md') || href.includes('/README');
    });
  if (leftover.length > 0) {
    throw new Error(
      `${path.relative(path.join(__dirname, '..'), targetPath)} still has local README links that Docusaurus cannot resolve: ${leftover.join(', ')}`,
    );
  }
}

function syncReadme(config) {
  const sourcePath = path.join(__dirname, '../../packages', config.sourcePackage, 'README.md');
  const targetPath = path.join(__dirname, '../docs', config.targetDoc);

  let content = fs.readFileSync(sourcePath, 'utf8');
  if (config.hasImages) {
    content = transformImagePaths(content, config.sourcePackage);
  }
  content = transformRepoLinks(content, `packages/${config.sourcePackage}`);

  const docContent = `---\ntitle: ${config.title}\n---\n\n` + content;
  assertNoBrokenLocalDocLinks(targetPath, docContent);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, docContent, 'utf8');
  console.log(`✅ Synced ${config.sourcePackage}/README.md → docs/${config.targetDoc}`);
}

function syncRootDoc(config) {
  const sourcePath = path.join(__dirname, '../../docs', config.sourceFile);
  const targetPath = path.join(__dirname, '../docs', config.targetDoc);

  let content = fs.readFileSync(sourcePath, 'utf8');
  content = transformRepoLinks(content, 'docs');

  const docContent = `---\ntitle: ${config.title}\n---\n\n` + content;
  assertNoBrokenLocalDocLinks(targetPath, docContent);
  fs.writeFileSync(targetPath, docContent, 'utf8');
  console.log(`✅ Synced docs/${config.sourceFile} → docs/${config.targetDoc}`);
}

// Main execution
try {
  console.log('🔄 Syncing docs...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const config of readmeConfigs) {
    const sourcePath = path.join(__dirname, '../../packages', config.sourcePackage, 'README.md');
    if (!fs.existsSync(sourcePath)) {
      console.log(`⏭️  Skipping ${config.sourcePackage} README — not found`);
      continue;
    }
    try {
      syncReadme(config);
      successCount++;
    } catch (err) {
      console.error(`❌ Error syncing ${config.sourcePackage} README:`, err.message);
      errorCount++;
    }
  }

  for (const config of rootDocConfigs) {
    const sourcePath = path.join(__dirname, '../../docs', config.sourceFile);
    if (!fs.existsSync(sourcePath)) {
      console.log(`⏭️  Skipping docs/${config.sourceFile} — not found`);
      continue;
    }
    try {
      syncRootDoc(config);
      successCount++;
    } catch (err) {
      console.error(`❌ Error syncing docs/${config.sourceFile}:`, err.message);
      errorCount++;
    }
  }

  const summary = [`${successCount} synced`, errorCount > 0 ? `${errorCount} errors` : null]
    .filter(Boolean)
    .join(', ');
  console.log(`\n✨ Completed: ${summary}`);

  if (errorCount > 0) process.exit(1);
} catch (err) {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
}
