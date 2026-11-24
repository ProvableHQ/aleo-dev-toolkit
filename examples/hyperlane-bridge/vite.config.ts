import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'esnext' },
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
