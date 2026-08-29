/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { ProxyOptions, HttpProxy } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({mode}) => {
  loadEnv(mode, '.', '');
  const apiProxyConfig: ProxyOptions = {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: (proxy: HttpProxy.Server) => {
      proxy.on('error', (err: Error, _req: IncomingMessage, res: ServerResponse | unknown) => {
        const serverRes = res as ServerResponse | undefined;
        if (serverRes && !serverRes.headersSent && typeof serverRes.writeHead === 'function') {
          serverRes.writeHead(502, {
            'Content-Type': 'application/json',
          });
          serverRes.end(
            JSON.stringify({
              error: 'Backend API server unavailable on http://localhost:3000',
              code: 'API_GATEWAY_ERROR',
              details: err.message,
            })
          );
        }
      });
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': apiProxyConfig,
      },
    },
    preview: {
      port: 3000,
      proxy: {
        '/api': apiProxyConfig,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    }
  };
});
