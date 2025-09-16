// vite.config.js
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Simple API proxy plugin for development
function apiProxyPlugin(env) {
  const handleApiRoute = async (req, res, routePath, handlerPath) => {
    try {
      // Load environment variables into process.env for the serverless function
      Object.assign(process.env, env);
      
      // Import the serverless function
      const absolutePath = path.resolve(__dirname, handlerPath);
      const { default: handler } = await import(absolutePath);
      
      // Parse request data first
      let requestBody = {};
      let requestQuery = {};
      
      if (req.method === 'GET') {
        // Parse query parameters from URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        url.searchParams.forEach((value, key) => {
          requestQuery[key] = value;
        });
      } else {
        // Parse body for POST requests
        requestBody = await new Promise((resolve) => {
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
        });
      }

      // Create a mock Next.js-style req/res for the handler
      const mockReq = {
        method: req.method,
        query: requestQuery,
        body: requestBody,
        headers: req.headers
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
      console.error(`API proxy error for ${routePath}:`, error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  };

  return {
    name: 'api-proxy',
    configureServer(server) {
      // Handle /api/prove route
      server.middlewares.use('/api/prove', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/prove', './api/prove.js');
      });

      // Handle KYC API routes
      server.middlewares.use('/api/kyc/initialize', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/kyc/initialize', './api/kyc/initialize.js');
      });

      server.middlewares.use('/api/kyc/status', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/kyc/status', './api/kyc/status.js');
      });

      server.middlewares.use('/api/kyc/webhook', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/kyc/webhook', './api/kyc/webhook.js');
      });

      server.middlewares.use('/api/kyc/upload-document', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/kyc/upload-document', './api/kyc/upload-document.js');
      });

      // Handle Rust server proxy routes
      server.middlewares.use('/api/rust/verify', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        await handleApiRoute(req, res, '/api/rust/verify', './api/rust/verify.js');
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