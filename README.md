# SQL Playground

An interactive SQL training platform that teaches relational database concepts through
gamified missions. The entire application runs **serverless in the browser**: an in-browser
[DuckDB-Wasm](https://duckdb.org/docs/api/wasm) engine executes every query client-side, so
there is no backend, no database server, and no network round-trip to run a lesson.

## Features

- **Interactive SQL editor** — write and execute SQL directly in the page.
- **Mission-based learning** — 25 missions with descriptions, expected queries, and success criteria.
- **Real in-browser engine** — DuckDB-Wasm compiles and runs actual SQL; this is not a parser or a mock.
- **Result visualization** — tabular output compared against the expected result.
- **Schema viewer & ERD** — inspect tables and an Entity-Relationship Diagram generated from live metadata.
- **Progress tracking** — completed missions are persisted per scenario inside DuckDB.
- **DB console & debug widget** — run ad-hoc SQL and inspect engine state.
- **Dark mode & font sizing** — persisted across sessions.

## Technologies

- **React 19** + **Vite 6** + **TypeScript**
- **DuckDB-Wasm** — the SQL engine, compiled to WebAssembly
- **Tailwind CSS** (via CDN)

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev      # dev server, http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
```

## Deployment

The app is a fully static SPA and deploys to **GitHub Pages**.

Build output goes to `dist/`; deployment runs from the GitHub Actions workflow in
`.github/workflows/`. Configure **Settings → Pages → Source → GitHub Actions**.

Asset paths are emitted relative (`base: './'`), so the same build works both at a custom
domain root and under a project subpath.

## Architecture notes

- **Flat source layout.** Components, services, and constants live at the repository root
  (`App.tsx`, `components/`, `services/`, `constants.ts`). There is no `src/` directory.
- **DuckDB bundles are local.** The worker and `.wasm` payloads are served from the app's own
  origin instead of a CDN, so DuckDB loads with no external dependency at runtime.
- **No API key is embedded.** The application contains no AI provider integration; the
  tutor feature is not currently wired up.

## Status

Actively developed. The AI SQL tutor mentioned in earlier versions of this README was
removed along with its broken provider module; see the pull request for details.

## License

See [LICENSE](./LICENSE).
