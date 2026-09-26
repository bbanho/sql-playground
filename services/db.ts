
import * as duckdb from '@duckdb/duckdb-wasm';
import { QueryResult, Scenario, Mission, TableSchema, ErdNode, ErdEdge } from '../types';
import { BOOTSTRAP_SQL } from '../constants';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

// DuckDB bundles are served from this app's own origin (relative to Vite `base`),
// so the app stays self-contained on GitHub Pages with no external CDN at runtime.
//
// These point at `public/duckdb/`, which `scripts/sync-duckdb.cjs` populates
// before dev/build. They deliberately avoid Vite's `?url` import: that routes the
// .wasm through the module transform, which answers with a JS shim instead of the
// binary, and `instantiate()` then hangs forever. public/ serves raw bytes in both
// dev and production.
//
// The URLs MUST be absolute. duckdb-wasm constructs `new Request(url)` for the
// WASM payload inside the worker, where a root-relative path has no base to
// resolve against and throws "Failed to parse URL from /duckdb/duckdb-eh.wasm".
//
// They must also honor the deploy base: the stable build serves from the domain
// root while the beta build serves from /beta/, and BASE_URL is whichever that
// is. Resolving against BASE_URL keeps a single code path correct in both, which
// a hardcoded '/duckdb/...' or a bare 'duckdb/...' (origin-relative) would not.
const assetUrl = (path: string): string =>
  new URL(`${import.meta.env.BASE_URL}duckdb/${path}`, window.location.origin).href;

const LOCAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: assetUrl('duckdb-eh.wasm'), mainWorker: assetUrl('duckdb-browser-eh.worker.js') },
  eh: { mainModule: assetUrl('duckdb-eh.wasm'), mainWorker: assetUrl('duckdb-browser-eh.worker.js') },
};

// Initialize the database and ensure system tables exist
export const initDb = async (): Promise<void> => {
  if (!db) {
    const bundle = await duckdb.selectBundle(LOCAL_BUNDLES);
    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker ?? null);
  }

  if (conn) {
    await conn.close();
  }
  conn = await db.connect();
  
  // Create system tables and default content if they don't exist
  await conn.query(BOOTSTRAP_SQL);
};

// --- System Fetchers ---

export const fetchScenarios = async (): Promise<Scenario[]> => {
  if (!conn) throw new Error("DB not init");
  const res = await conn.query("SELECT * FROM System_Scenarios");
  const scenarios: Scenario[] = res.toArray().map(r => ({
    id: r.toJSON().id,
    name: r.toJSON().name,
    description: r.toJSON().description,
    seedSql: r.toJSON().seed_sql,
    missions: [] // Will be populated separately or on selection
  }));
  return scenarios;
};

export const fetchMissions = async (scenarioId: string): Promise<Mission[]> => {
  if (!conn) throw new Error("DB not init");
  const res = await conn.query(`SELECT * FROM System_Missions WHERE scenario_id = '${scenarioId}' ORDER BY order_index ASC`);
  const missions = res.toArray().map(r => {
    const json = r.toJSON();
    return {
       id: json.id,
       scenario_id: json.scenario_id,
       title: json.title,
       desc: json.description,
       expected: json.expected_sql,
       successMessage: json.success_message,
       order_index: json.order_index
    };
  });
  return missions;
};

export const fetchCompletedMissionIds = async (scenarioId: string): Promise<number[]> => {
  if (!conn) return [];
  try {
    const res = await conn.query(`SELECT mission_id FROM System_Progress WHERE scenario_id = '${scenarioId}'`);
    return res.toArray().map(r => r.toJSON().mission_id);
  } catch (e) {
    return [];
  }
};

export const saveProgress = async (scenarioId: string, missionId: number, query: string) => {
  if (!conn) return;
  // Upsert progress
  const escapedQuery = query.replace(/'/g, "''");
  await conn.query(`
    INSERT INTO System_Progress (scenario_id, mission_id, user_query) 
    VALUES ('${scenarioId}', ${missionId}, '${escapedQuery}')
    ON CONFLICT (scenario_id, mission_id) DO UPDATE SET completed_at = CURRENT_TIMESTAMP, user_query = '${escapedQuery}';
  `);
};

// --- Environment Setup ---

export const loadScenarioEnvironment = async (seedSql: string) => {
  if (!conn) return;
  await conn.query(seedSql);
};

export const fetchSchema = async (): Promise<TableSchema[]> => {
  if (!conn) return [];
  // Exclude system tables from schema view
  const res = await conn.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'main' AND table_name NOT LIKE 'System_%' ORDER BY table_name, ordinal_position");
  
  const raw = res.toArray().map(r => r.toJSON());
  const schemaMap = new Map<string, string[]>();
  
  raw.forEach((r: any) => {
    if (!schemaMap.has(r.table_name)) {
      schemaMap.set(r.table_name, []);
    }
    schemaMap.get(r.table_name)?.push(r.column_name);
  });

  return Array.from(schemaMap.entries()).map(([tableName, columns]) => ({ tableName, columns }));
};

/**
 * Render the schema as a CREATE TABLE skeleton, for giving a model the exact
 * tables and columns it is allowed to use. Without this the model invents
 * columns that do not exist and the student gets exercises that cannot run.
 */
export const serializeSchema = async (): Promise<string> => {
  const tables = await fetchSchema();
  return tables
    .map((t) => `${t.tableName}(${t.columns.join(', ')})`)
    .join('\n');
};

/**
 * Persist AI-generated exercises into the student's own question bank.
 *
 * These are the student's rows. The model proposed them and the student
 * accepted them, so provenance is recorded: `source` says they came from the
 * assistant and `origin` keeps the prompt topic, which makes it possible to
 * tell generated material from seeded material later.
 */
export const saveGeneratedQuestions = async (
  drafts: { title: string; description: string; expected_sql: string; success_message: string; difficulty: string; tags: string[] }[],
  origin: string,
  scenarioId: string,
): Promise<number> => {
  if (!conn) return 0;
  if (drafts.length === 0) return 0;

  const esc = (v: string) => String(v).replace(/'/g, "''");
  const nextOrder = await nextMissionOrder(scenarioId);

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    await conn.query(`
      INSERT INTO System_Missions
        (scenario_id, order_index, title, description, expected_sql, success_message,
         difficulty, tags, source, origin)
      VALUES
        ('${esc(scenarioId)}', ${nextOrder + i}, '${esc(d.title)}', '${esc(d.description)}',
         '${esc(d.expected_sql)}', '${esc(d.success_message)}', '${esc(d.difficulty)}',
         '${esc((d.tags || []).join(','))}', 'gemini', '${esc(origin)}')
    `);
  }

  return drafts.length;
};

/** The order_index to give the next mission appended to a scenario. */
const nextMissionOrder = async (scenarioId: string): Promise<number> => {
  if (!conn) return 0;
  const res = await conn.query(
    `SELECT COALESCE(MAX(order_index), 0) AS max_order FROM System_Missions WHERE scenario_id = '${scenarioId.replace(/'/g, "''")}'`,
  );
  const row = res.toArray()[0]?.toJSON() as { max_order: number } | undefined;
  return Number(row?.max_order ?? 0) + 1;
};

// Basic ERD Generation (Dynamic based on tables)
export const generateErdData = async (schemas: TableSchema[]): Promise<{nodes: ErdNode[], edges: ErdEdge[]}> => {
  const nodes: ErdNode[] = [];
  const edges: ErdEdge[] = [];
  
  schemas.forEach((schema, idx) => {
    // Simple layout algorithm: Circle or Grid
    const x = (idx % 3) * 300 + 50;
    const y = Math.floor(idx / 3) * 250 + 50;
    
    // Mark probable keys
    const fields = schema.columns.map(c => {
      const lower = c.toLowerCase();
      if (lower.endsWith('codigo') || lower.endsWith('id') || lower.endsWith('rm')) return `#${c}`;
      return c;
    });

    nodes.push({
      id: schema.tableName,
      label: schema.tableName,
      x, y, fields
    });
  });

  // Infer edges (naive FK detection by name matching)
  nodes.forEach(source => {
    source.fields.forEach(field => {
       const cleanField = field.replace('#', '');
       // Check if this field exists as a PK in another table
       nodes.forEach(target => {
          if (source.id === target.id) return;
          // Heuristic: If field name matches target table name prefix or standard ID pattern
          // E.g., Cur_Codigo in Disciplinas matches Cursos(Cur_Codigo)
          const targetPk = target.fields.find(f => f.replace('#','') === cleanField);
          if (targetPk) {
             edges.push({ from: target.id, to: source.id });
          }
       });
    });
  });

  return { nodes, edges };
};

// --- Database Operations ---

export const runQuery = async (sql: string): Promise<QueryResult | { error: string }> => {
  if (!conn) {
    return { error: "Banco de dados não inicializado." };
  }

  try {
    const result = await conn.query(sql);
    const rows = result.toArray().map((row) => {
      const cleanRow: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowData = row.toJSON() as any; 
      for (const key in rowData) {
        cleanRow[key] = rowData[key];
      }
      return cleanRow;
    });

    return rows;
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
};

export const validateQuery = async (sql: string): Promise<string | null> => {
  if (!conn || !sql.trim()) return null;
  try {
    const stmt = await conn.prepare(sql);
    await stmt.close();
    return null;
  } catch (err: unknown) {
    return (err as Error).message;
  }
};

// --- Maintenance ---

export const factoryReset = async (): Promise<void> => {
  if (!conn) return;
  // Drop all known tables. In DuckDB WASM we might need to be explicit or just drop the common ones.
  // Since we don't have DROP DATABASE, we drop tables we know.
  // We can query existing tables and drop them.
  const tables = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema='main'");
  for (const t of tables.toArray()) {
    const name = t.toJSON().table_name;
    await conn.query(`DROP TABLE IF EXISTS ${name} CASCADE`);
  }
  // Re-run bootstrap
  await conn.query(BOOTSTRAP_SQL);
};

export const clearProgress = async (): Promise<void> => {
  if (!conn) return;
  await conn.query("DELETE FROM System_Progress");
};

export const downloadDatabaseBackup = async () => {
  if (!conn) return;
  // Since we can't easily export the binary DuckDB file in this specific WASM setup without re-init,
  // we will dump the System tables to JSON.
  const scenarios = await conn.query("SELECT * FROM System_Scenarios");
  const missions = await conn.query("SELECT * FROM System_Missions");
  const progress = await conn.query("SELECT * FROM System_Progress");
  
  const backup = {
    scenarios: scenarios.toArray().map(r => r.toJSON()),
    missions: missions.toArray().map(r => r.toJSON()),
    progress: progress.toArray().map(r => r.toJSON()),
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sql_trainer_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadAsJson = (data: QueryResult, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadAsCsv = (data: QueryResult, filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const val = row[header];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
