import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: { input: { index: 'index.html', tests: 'tests.html' } },
  },
  optimizeDeps: {
    exclude: ['@provablehq/aleo-wallet-algorithms', '@provablehq/sdk', '@provablehq/wasm'],
    include: [
      '@provablehq/aleo-wallet-algorithms > @provablehq/sdk > core-js/proposals/json-parse-with-source.js',
    ],
  },
  server: {
    host: '127.0.0.1',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
