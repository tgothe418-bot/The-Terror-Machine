/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';

type ViteMiddlewareHost = Pick<ViteDevServer, 'middlewares'> | Pick<PreviewServer, 'middlewares'>;

async function mountTtmApiRuntime(server: ViteMiddlewareHost): Promise<void> {
  const { createApp } = await import('./server/app');
  const apiApp = await createApp({ enableSpaFallback: false });
  server.middlewares.use(apiApp);
}

/**
 * AI Studio may start Vite directly instead of executing server.ts. Mount the same
 * server-only Express API in that topology so /api can never fall through to SPA HTML.
 */
export function ttmApiRuntimePlugin(): Plugin {
  return {
    name: 'ttm-api-runtime',
    configureServer: mountTtmApiRuntime,
    configurePreviewServer: mountTtmApiRuntime,
  };
}

export default defineConfig(() => {
  return {
    plugins: [ttmApiRuntimePlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 3000,
    },
    test: {
      environment: 'jsdom',
      globals: true,
    }
  };
});
