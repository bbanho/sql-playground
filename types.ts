
export interface Mission {
  id: number;
  scenario_id: string; // Foreign key
  title: string;
  desc: string;
  expected: string;
  successMessage: string;
  order_index: number;
}

export interface TableSchema {
  tableName: string;
  columns: string[];
}

export type QueryRow = Record<string, unknown>;
export type QueryResult = QueryRow[];

// ERD Types
export interface ErdNode {
  id: string;
  x: number;
  y: number;
  label: string;
  fields: string[];
}

export interface ErdEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  seedSql: string; // The SQL to create the exercise tables (Alunos, etc)
  // schema, erdNodes, erdEdges are now derived dynamically or stored in JSON fields in DB if needed. 
  // For simplicity in this refactor, we will generate schema dynamically from DB metadata.
  missions: Mission[];
}

export type FontSize = 'text-xs' | 'text-sm' | 'text-base';
