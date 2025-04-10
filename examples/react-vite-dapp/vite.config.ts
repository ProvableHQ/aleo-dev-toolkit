import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'tsx',  // This is the correct way to configure the loader for JSX
    target: 'es2022',  // Ensure that top-level await is supported
    jsxInject: 'import React from "react"'  // Optional for React projects

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