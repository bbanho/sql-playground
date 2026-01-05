
import React from 'react';
import { QueryResult, FontSize } from '../types';
import { downloadAsCsv, downloadAsJson } from '../services/db';

interface ResultTableProps {
  data: QueryResult | null;
  title: string;
  emptyMessage?: string;
  isError?: boolean;
  fontSize: FontSize;
}

interface TableContainerProps {
  children: React.ReactNode;
  borderColor?: string;
  title: string;
  recordCount?: number;
  onExportCsv?: () => void;
  onExportJson?: () => void;
}

const TableContainer: React.FC<TableContainerProps> = ({ children, borderColor = "border-ice-300 dark:border-slate-700", title, recordCount, onExportCsv, onExportJson }) => (
  <div className={`flex flex-col h-full border ${borderColor} bg-ice-100 dark:bg-slate-900`}>
    <div className={`px-3 py-2 border-b ${borderColor} bg-ice-200 dark:bg-slate-800 flex justify-between items-center`}>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{title}</span>
      <div className="flex items-center gap-2">
        {recordCount !== undefined && recordCount > 0 && (
          <div className="flex gap-1">
             <button onClick={onExportCsv} title="Export CSV" className="p-1 hover:bg-ice-300 dark:hover:bg-slate-600 rounded-sm text-slate-600 dark:text-slate-400">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </button>
             <button onClick={onExportJson} title="Export JSON" className="p-1 hover:bg-ice-300 dark:hover:bg-slate-600 rounded-sm text-slate-600 dark:text-slate-400">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
             </button>
          </div>
        )}
        {recordCount !== undefined && (
          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-ice-300 dark:bg-slate-700 px-1.5 rounded-none">
            {recordCount}
          </span>
        )}
      </div>
    </div>
    {children}
  </div>
);

const ResultTable: React.FC<ResultTableProps> = ({ data, title, emptyMessage = "Sem dados", isError = false, fontSize }) => {
  if (!data) {
    return (
      <TableContainer title={title}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-600">
          <span className="text-xs font-mono uppercase tracking-widest">Aguardando...</span>
        </div>
      </TableContainer>
    );
  }

  if (isError) {
     return (
      <TableContainer title={title} borderColor="border-red-300 dark:border-red-800">
        <div className="p-4 bg-red-50 dark:bg-red-900/10 h-full overflow-auto">
          <pre className="text-red-700 dark:text-red-400 text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </TableContainer>
    );
  }

  if (data.length === 0) {
    return (
      <TableContainer title={title} recordCount={0}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-500">
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </TableContainer>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <TableContainer 
      title={title} 
      recordCount={data.length} 
      onExportCsv={() => downloadAsCsv(data, 'resultado_export')}
      onExportJson={() => downloadAsJson(data, 'resultado_export')}
    >
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700">
        <table className={`w-full text-left whitespace-nowrap border-collapse ${fontSize}`}>
          <thead className="bg-ice-100 dark:bg-slate-800 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 border-b border-r last:border-r-0 border-ice-300 dark:border-slate-700 text-xs tracking-tight uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-slate-700 dark:text-slate-300">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 even:bg-ice-50 dark:even:bg-slate-800/50">
                {columns.map((col) => (
                  <td key={`${i}-${col}`} className="px-4 py-2 border-b border-r last:border-r-0 border-ice-200 dark:border-slate-800/50">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableContainer>
  );
};

export default ResultTable;
