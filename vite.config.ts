import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths: the same build works when served from a custom domain
  // root (sql-playground.axio.eng.br) and from a project subpath (/sql-playground/).
  base: './',
  plugins: [react()],
  // DuckDB's worker + .wasm are ~35MB each; keep them out of the JS graph and
  // serve them as static assets from this origin (no runtime CDN dependency).
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
  },
});
