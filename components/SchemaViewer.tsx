
import React from 'react';
import { TableSchema, FontSize } from '../types';

interface SchemaViewerProps {
  schemas: TableSchema[];
  fontSize: FontSize;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schemas, fontSize }) => {
  return (
    <div className="flex flex-col h-full bg-ice-100 dark:bg-slate-900 w-full overflow-hidden border-l border-ice-300 dark:border-slate-800">
      <div className="p-3 bg-ice-200 dark:bg-slate-950 border-b border-ice-300 dark:border-slate-800 sticky top-0 z-10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
          Schema
        </h3>
        <span className="text-[10px] bg-ice-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-none font-mono">
          {schemas.length} TB
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700">
        {schemas.map((schema) => (
          <div key={schema.tableName} className="bg-ice-50 dark:bg-slate-900 border border-ice-300 dark:border-slate-700">
            <div className="bg-ice-200 dark:bg-slate-800 px-3 py-1.5 border-b border-ice-300 dark:border-slate-700">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{schema.tableName}</span>
            </div>
            
            <ul className="divide-y divide-ice-200 dark:divide-slate-800">
              {schema.columns.map((col) => {
                 const isKey = col.toLowerCase().includes('id') || col.toLowerCase().includes('codigo') || col.toLowerCase().includes('rm');
                 return (
                  <li key={col} className={`px-3 py-1.5 text-[10px] font-mono flex items-center justify-between hover:bg-ice-100 dark:hover:bg-slate-800 ${isKey ? 'text-slate-900 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span>{col}</span>
                    {isKey && <span className="text-[9px] text-blue-700 dark:text-blue-400 tracking-tighter border border-blue-200 dark:border-blue-900 px-0.5 rounded-none bg-blue-50 dark:bg-blue-900/30">PK</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemaViewer;
