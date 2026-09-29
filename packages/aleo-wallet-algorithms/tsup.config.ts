import { defineConfig, type Options } from 'tsup';
const entry = {
  index: 'src/index.ts',
  'program-scoped-blinding-factor': 'src/program-scoped-blinding-factor.ts',
  'program-scoped-blinded-address': 'src/program-scoped-blinded-address.ts',
  'program-scoped-blinding': 'src/program-scoped-blinding.ts',
  'storage/indexeddb': 'src/storage/indexeddb.ts',
  schemas: 'src/schemas.ts',
  lifecycle: 'src/lifecycle.ts',
  testing: 'src/testing.ts',
};
const configs: Options[] = [
  {
    entry,
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    define: { __ALGORITHM_NETWORK__: JSON.stringify('testnet') },
  },
  {
    entry: Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== 'testing' && key !== 'storage/indexeddb'),
    ),
    outDir: 'dist/mainnet',
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    define: { __ALGORITHM_NETWORK__: JSON.stringify('mainnet') },
    // Let the network rewrite run before tsup externalizes the SDK dependency.
    noExternal: ['@provablehq/sdk/testnet.js'],
    esbuildPlugins: [
      {
        name: 'mainnet-sdk',
        setup(build) {
          build.onResolve({ filter: /^@provablehq\/sdk\/testnet\.js$/ }, () => ({
            path: '@provablehq/sdk/mainnet.js',
            external: true,
          }));
        },
      },
    ],
  },
];
export default defineConfig(configs[process.env.ALGORITHM_BUILD === 'mainnet' ? 1 : 0]);
