#!/usr/bin/env node
/**
 * Copy the DuckDB runtime artifacts into public/duckdb/ so both the dev server
 * and a production build serve them as plain static files.
 *
 * Why this exists: importing the .wasm with Vite's `?url` suffix routes it
 * through the module transform, which answers with a tiny JS shim
 * (`export default "..."`) instead of the binary. DuckDB's `instantiate()`
 * then never receives the real payload and the app hangs on the bootstrap
 * screen forever — visible only in `npm run dev`, because a production build
 * emits the file as a real asset. Serving from public/ bypasses the transform
 * entirely, so dev and production behave identically.
 *
 * The files are ~35MB, so they are gitignored and synced on demand rather than
 * committed. Run automatically via the `predev` and `prebuild` npm scripts.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'node_modules', '@duckdb', 'duckdb-wasm', 'dist');
const outDir = path.join(root, 'public', 'duckdb');

const FILES = ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js'];

if (!fs.existsSync(srcDir)) {
  console.error('[sync-duckdb] @duckdb/duckdb-wasm is not installed. Run `npm ci` first.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = path.join(srcDir, file);
  const dest = path.join(outDir, file);
  if (!fs.existsSync(src)) {
    console.error(`[sync-duckdb] missing source file: ${file}`);
    process.exit(1);
  }
  const srcStat = fs.statSync(src);
  if (fs.existsSync(dest) && fs.statSync(dest).size === srcStat.size) {
    continue; // already synced
  }
  fs.copyFileSync(src, dest);
  copied++;
}

console.log(
  copied === 0
    ? '[sync-duckdb] public/duckdb already up to date'
    : `[sync-duckdb] copied ${copied} file(s) to public/duckdb`,
);
