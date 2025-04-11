import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react', 
    'react-dom', 
    '@provablehq/aleo-wallet-adaptor-react',
    '@provablehq/aleo-wallet-adaptor-core',
    '@provablehq/aleo-wallet-standard'
  ],
}); 