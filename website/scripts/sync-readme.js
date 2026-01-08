#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repo = 'ProvableHQ/aleo-dev-toolkit';
const branch = 'master';

// Configuration for syncing multiple READMEs
const readmeConfigs = [
  {
    sourcePackage: 'aleo-wallet-adaptor',
    targetDoc: 'wallet-adapter.md',
    title: 'Aleo Wallet Adapter',
    hasImages: true, // If the package has images in docs/images/
  },
  // Add more configurations here as needed
  //   {
  //     sourcePackage: 'aleo-hooks',
  //     targetDoc: 'aleo-hooks.md',
  //     title: 'Aleo Hooks',
  //     hasImages: false,
  //   },
  // {
  //   sourcePackage: 'aleo-types',
  //   targetDoc: 'aleo-types.md',
  //   title: 'Aleo Types',
  //   hasImages: false,
  // },
];

/**
 * Transforms image paths in markdown content to GitHub raw URLs
 */
function transformImagePaths(content, packagePath) {
  if (!packagePath) return content;

  const githubImagePath = `https://raw.githubusercontent.com/${repo}/${branch}/packages/${packagePath}/docs/images`;

  // Transform ./docs/images/ paths
  content = content.replace(/\]\(\.\/docs\/images\/([^)]+)\)/g, `](${githubImagePath}/$1)`);

  // Transform docs/images/ paths (without ./)
  content = content.replace(/\]\(docs\/images\/([^)]+)\)/g, `](${githubImagePath}/$1)`);

  return content;
}

/**
 * Syncs a single README from a package to the docs directory
 */
function syncReadme(config) {
  const sourcePath = path.join(__dirname, '../../packages', config.sourcePackage, 'README.md');
  const targetPath = path.join(__dirname, '../docs', config.targetDoc);

  try {
    // Read the source README
    let readmeContent = fs.readFileSync(sourcePath, 'utf8');

    // Transform image paths if the package has images
    if (config.hasImages) {
      readmeContent = transformImagePaths(readmeContent, config.sourcePackage);
    }

    // Add frontmatter for Docusaurus
    const frontmatter = `---
title: ${config.title}
---

`;

    // Combine frontmatter with README content
    const docContent = frontmatter + readmeContent;

    // Write to the docs file
    fs.writeFileSync(targetPath, docContent, 'utf8');

    console.log(`✅ Synced ${config.sourcePackage} → docs/${config.targetDoc}`);
  } catch (error) {
    console.error(`❌ Error syncing ${config.sourcePackage}:`, error.message);
    throw error;
  }
}

// Main execution
try {
  console.log('🔄 Syncing READMEs...\n');

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  readmeConfigs.forEach(config => {
    const sourcePath = path.join(__dirname, '../../packages', config.sourcePackage, 'README.md');

    if (!fs.existsSync(sourcePath)) {
      skippedCount++;
      console.log(`⏭️  Skipping ${config.sourcePackage} - README.md not found`);
      return;
    }

    try {
      syncReadme(config);
      successCount++;
    } catch (error) {
      errorCount++;
    }
  });

  const summary = [
    `${successCount} synced`,
    skippedCount > 0 ? `${skippedCount} skipped` : null,
    errorCount > 0 ? `${errorCount} errors` : null,
  ]
    .filter(Boolean)
    .join(', ');

  console.log(`\n✨ Completed: ${summary}`);

  if (errorCount > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
}
