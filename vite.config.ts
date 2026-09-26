import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deploy layout:
//   main -> stable, served from the domain root   (VITE_DEPLOY_BASE=./)
//   beta -> prerelease, served from /beta/        (VITE_DEPLOY_BASE=/beta/)
const base = process.env.VITE_DEPLOY_BASE || './';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative asset paths: the same build works when served from a custom domain
  // root (sql-playground.axio.eng.br) and from a project subpath (/beta/).
  base,
  plugins: [react()],
  // DuckDB is not pre-bundled: its ~35MB WASM is synced into public/duckdb by
  // scripts/sync-duckdb.cjs and referenced by plain URL, so it never enters the
  // module graph in either dev or production.
  optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
  resolve: {
    alias: {
      '@': here,
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
  },
});
