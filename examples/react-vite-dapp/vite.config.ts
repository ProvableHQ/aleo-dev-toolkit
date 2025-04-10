import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const wasmContentTypePlugin = {
  name: "wasm-content-type-plugin",
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm");
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasmContentTypePlugin],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    loader: 'tsx',  // This is the correct way to configure the loader for JSX
    supported: {
      'top-level-await': true //browsers can handle top-level-await features
    },
  },
  build: {
    target: ['es2022'],  // Modernize the build target
    rollupOptions: {
      external: ['@provablehq/sdk'],  // Mark the SDK as external
      output: {
        format: 'es',  // Ensure ES module output to support top-level await
      }
    }
  }
})