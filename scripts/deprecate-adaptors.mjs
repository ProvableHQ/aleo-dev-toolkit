import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = 'https://registry.npmjs.org/';
const migration =
  'https://github.com/ProvableHQ/aleo-dev-toolkit/blob/master/docs/migrating-to-adapter.md';
const args = process.argv.slice(2);
if (args.some(arg => !['--execute', '--dry-run'].includes(arg)) || args.length > 1) {
  console.error('Usage: node scripts/deprecate-adaptors.mjs [--dry-run | --execute]');
  process.exit(1);
}
const execute = args.includes('--execute');
const adapterPaths = [
  'core',
  'react',
  'react-ui',
  'wallets/fox',
  'wallets/leo',
  'wallets/puzzle',
  'wallets/shield',
  'wallets/soter',
].map(path => `packages/aleo-wallet-adapter/${path}`);
const readPackage = path => JSON.parse(readFileSync(`${root}/${path}/package.json`, 'utf8'));
const adapters = adapterPaths.map(readPackage);
const releasePackages = [
  ...adapters,
  ...['aleo-types', 'aleo-wallet-standard', 'aleo-hooks'].map(name =>
    readPackage(`packages/${name}`),
  ),
];

function npm(args, capture = false) {
  const result = spawnSync('npm', [...args, `--registry=${registry}`], {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args[0]} failed (${result.status})`);
  return result.stdout;
}

try {
  // Check the entire release before the first registry mutation. A partial
  // publish must never leave consumers pointed at unavailable dependencies.
  if (execute) {
    for (const pkg of releasePackages) {
      const spec = `${pkg.name}@${pkg.version}`;
      const published = JSON.parse(npm(['view', spec, 'version', '--json'], true));
      if (published !== pkg.version) throw new Error(`${spec} is not published`);
      console.log(`Verified ${spec}`);
    }
  } else {
    console.log(
      'Preview only; no registry changes. Run with --execute after publishing the full release.',
    );
  }

  for (const pkg of adapters) {
    const oldName = pkg.name.replace('/aleo-wallet-adapter-', '/aleo-wallet-adaptor-');
    const message = `Renamed to ${pkg.name}. Install ${pkg.name} and replace all adaptor imports with adapter. Migration: ${migration}`;
    const command = ['deprecate', `${oldName}@*`, message];
    console.log(
      ['npm', ...command.map(arg => JSON.stringify(arg)), `--registry=${registry}`].join(' '),
    );
    if (execute) npm(command);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
