import * as duckdb from '@duckdb/duckdb-wasm';
import { QueryResult, Scenario, Mission, TableSchema, ErdNode, ErdEdge } from '../types';
import { SCENARIOS } from '../constants';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

export const initDb = async (): Promise<void> => {
  if (!db) {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const workerBlob = new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  }
  
  if (conn) {
    await conn.close();
  }
  conn = await db.connect();
  
  // Create system tables for progress persistence
  await conn.query(`
    CREATE TABLE IF NOT EXISTS System_Progress (
      scenario_id TEXT,
      mission_id INTEGER,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_query TEXT,
      PRIMARY KEY (scenario_id, mission_id)
    );
  `);
};

export const fetchScenarios = async (): Promise<Scenario[]> => {
  return SCENARIOS;
};

export const fetchMissions = async (scenarioId: string): Promise<Mission[]> => {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  return scenario ? scenario.missions : [];
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
  const escapedQuery = query.replace(/'/g, "''");
  try {
    await conn.query(`
      INSERT INTO System_Progress (scenario_id, mission_id, user_query) 
      VALUES ('${scenarioId}', ${missionId}, '${escapedQuery}')
      ON CONFLICT (scenario_id, mission_id) DO UPDATE SET completed_at = CURRENT_TIMESTAMP, user_query = '${escapedQuery}';
    `);
  } catch (e) {
    console.error(e);
  }
};

export const loadScenarioEnvironment = async (seedSql: string) => {
  if (!conn) return;
  
  // Drop known exercise tables to ensure clean state
  try {
    await conn.query(`
      DROP TABLE IF EXISTS Alunos; 
      DROP TABLE IF EXISTS Disciplinas; 
      DROP TABLE IF EXISTS Aproveitamentos; 
      DROP TABLE IF EXISTS Cursos; 
      DROP TABLE IF EXISTS Professores;
    `);
  } catch (e) {
    // ignore
  }

  if (seedSql) {
    await conn.query(seedSql);
  }
};

export const fetchSchema = async (): Promise<TableSchema[]> => {
  if (!conn) return [];
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

export const generateErdData = async (schemas: TableSchema[]): Promise<{nodes: ErdNode[], edges: ErdEdge[]}> => {
  const nodes: ErdNode[] = [];
  const edges: ErdEdge[] = [];
  
  schemas.forEach((schema, idx) => {
    const x = (idx % 3) * 300 + 50;
    const y = Math.floor(idx / 3) * 250 + 50;
    
    const fields = schema.columns.map(c => {
      const lower = c.toLowerCase();
      if (lower.endsWith('codigo') || lower.endsWith('id') || lower.endsWith('rm') || lower === 'id') return `#${c}`;
      return c;
    });

    nodes.push({
      id: schema.tableName,
      label: schema.tableName,
      x, y, fields
    });
  });

  nodes.forEach(source => {
    source.fields.forEach(field => {
       if (!field.startsWith('#')) return;
       const cleanField = field.replace('#', '');
       
       nodes.forEach(target => {
          if (source.id === target.id) return;
          const targetHasField = target.fields.some(f => f.replace('#','') === cleanField);
          
          if (targetHasField) {
             const key = [source.id, target.id].sort().join('-');
             if (!edges.some(e => [e.from, e.to].sort().join('-') === key)) {
                edges.push({ from: target.id, to: source.id });
             }
          }
       });
    });
  });

  return { nodes, edges };
};

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

export const factoryReset = async (): Promise<void> => {
  if (!conn) return;
  await conn.query("DROP TABLE IF EXISTS System_Progress");
  await initDb();
};

export const clearProgress = async (): Promise<void> => {
  if (!conn) return;
  await conn.query("DELETE FROM System_Progress");
};

export const downloadDatabaseBackup = async () => {
  if (!conn) return;
  const progress = await conn.query("SELECT * FROM System_Progress");
  
  const backup = {
    progress: progress.toArray().map(r => r.toJSON()),
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
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