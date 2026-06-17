#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repo = 'ProvableHQ/aleo-dev-toolkit';
const branch = 'master';

// READMEs synced from packages/<sourcePackage>/README.md
const readmeConfigs = [
  {
    sourcePackage: 'aleo-wallet-adaptor',
    targetDoc: 'wallet-adapter.md',
    title: 'Aleo Wallet Adapter',
    hasImages: true,
  },
  // Add more as needed:
  // { sourcePackage: 'aleo-hooks', targetDoc: 'aleo-hooks.md', title: 'Aleo Hooks', hasImages: false },
];

// Docs synced from the repo-root docs/ directory
const rootDocConfigs = [
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
 * Transforms relative repo paths (../../examples/...) to GitHub blob URLs
 * so they resolve correctly on the Docusaurus website.
 */
function transformRepoLinks(content) {
  const base = `https://github.com/${repo}/blob/${branch}`;
  // Match markdown links whose href starts with one or more "../" and doesn't start with http
  content = content.replace(/\]\((\.\.[^)]+)\)/g, (match, href) => {
    // Resolve the relative path against the repo root (packages/<pkg>/docs/)
    // We can't know the exact source path at call time, so we normalise by
    // stripping leading "../" segments that escape the repo root.
    // The links in the quickstart resolve to repo-root-relative paths after
    // normalization (e.g. "examples/react-app/...").
    const normalized = href.replace(/^(\.\.\/)+/, '');
    return `](${base}/${normalized})`;
  });
  return content;
}

function syncReadme(config) {
  const sourcePath = path.join(__dirname, '../../packages', config.sourcePackage, 'README.md');
  const targetPath = path.join(__dirname, '../docs', config.targetDoc);

  let content = fs.readFileSync(sourcePath, 'utf8');
  if (config.hasImages) {
    content = transformImagePaths(content, config.sourcePackage);
  }
  content = transformRepoLinks(content);

  const docContent = `---\ntitle: ${config.title}\n---\n\n` + content;
  fs.writeFileSync(targetPath, docContent, 'utf8');
  console.log(`✅ Synced ${config.sourcePackage}/README.md → docs/${config.targetDoc}`);
}

function syncRootDoc(config) {
  const sourcePath = path.join(__dirname, '../../docs', config.sourceFile);
  const targetPath = path.join(__dirname, '../docs', config.targetDoc);

  let content = fs.readFileSync(sourcePath, 'utf8');
  content = transformRepoLinks(content);

  const docContent = `---\ntitle: ${config.title}\n---\n\n` + content;
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
