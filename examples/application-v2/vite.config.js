// vite.config.js
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Simple API proxy plugin for development
function apiProxyPlugin(env) {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/prove', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          // Load environment variables into process.env for the serverless function
          Object.assign(process.env, env);
          
          // Import the serverless function
          const { default: handler } = await import('./api/prove.js');
          
          // Create a mock Next.js-style req/res for the handler
          const mockReq = {
            method: req.method,
            body: await new Promise((resolve) => {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  resolve(JSON.parse(body));
                } catch {
                  resolve({});
                }
              });
            })
          };

          const mockRes = {
            status: (code) => {
              res.statusCode = code;
              return mockRes;
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            setHeader: (name, value) => {
              res.setHeader(name, value);
            },
            send: (data) => {
              res.end(data);
            }
          };

          await handler(mockReq, mockRes);
        } catch (error) {
          console.error('API proxy error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), apiProxyPlugin(env)],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    optimizeDeps: {
      exclude: ["@provablehq/wasm"],
      include: ["@tensorflow/tfjs"],
    },

    // Add specific handling for WASM files
    assetsInclude: ["**/*.wasm"],

    // Add worker configuration for better ES module support
    worker: {
      format: "es",
      plugins: () => [react()],
    },

    // Update build configuration to support top-level await
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          format: "es",
        },
      },
    },

    // Update esbuild configuration for workers
    esbuild: {
      target: "esnext",
    },

    server: {
      port: 5175,
      host: true,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  };
});