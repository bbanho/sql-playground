
import React, { useState, useEffect, useRef } from 'react';
import { runQuery } from '../services/db';
import { QueryResult } from '../types';

interface ConsoleTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<{ type: 'in' | 'out' | 'err'; content: string | QueryResult }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setLogs(prev => [...prev, { type: 'in', content: cmd }]);
    setInput('');

    if (cmd.toLowerCase() === 'clear') {
      setLogs([]);
      return;
    }

    try {
      const res = await runQuery(cmd);
      if ('error' in (res as any)) {
        setLogs(prev => [...prev, { type: 'err', content: (res as any).error }]);
      } else {
        const rows = res as QueryResult;
        if (rows.length === 0) {
           setLogs(prev => [...prev, { type: 'out', content: 'Query executed successfully. No rows returned.' }]);
        } else {
           setLogs(prev => [...prev, { type: 'out', content: rows }]);
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'err', content: 'System Error' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[600px] bg-slate-950 border border-slate-700 shadow-2xl flex flex-col font-mono rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" onClick={onClose}></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-xs text-slate-400 font-bold">TERMINAL DE BANCO DE DADOS</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        {/* Output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          <div className="text-slate-500 mb-4">
            DuckDB Web Console v1.0<br/>
            Type SQL commands to interact directly with the database.<br/>
            Type 'clear' to reset console.
          </div>
          
          {logs.map((log, i) => (
            <div key={i} className="break-words">
              {log.type === 'in' && (
                <div className="text-yellow-400 flex gap-2">
                  <span className="opacity-50">$</span> <span>{log.content as string}</span>
                </div>
              )}
              {log.type === 'err' && (
                <div className="text-red-400 pl-4">
                  Error: {log.content as string}
                </div>
              )}
              {log.type === 'out' && (
                <div className="text-green-400 pl-4">
                  {typeof log.content === 'string' ? (
                    log.content
                  ) : (
                    <div className="overflow-x-auto mt-1 border border-slate-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            {Object.keys(log.content[0] || {}).map(k => <th key={k} className="p-1">{k}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {(log.content as QueryResult).slice(0, 10).map((row, rI) => (
                            <tr key={rI} className="border-b border-slate-800/50 hover:bg-slate-900">
                               {Object.values(row).map((v, cI) => <td key={cI} className="p-1 text-slate-300">{String(v)}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(log.content as QueryResult).length > 10 && <div className="p-1 text-slate-600 italic">... {(log.content as QueryResult).length - 10} more rows</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleCommand} className="flex bg-slate-900 p-2 border-t border-slate-800">
          <span className="text-yellow-400 mr-2 font-bold">{'>'}</span>
          <input 
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 text-sm font-mono"
            placeholder="Digite seu SQL..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </form>
      </div>
    </div>
  );
};

export default ConsoleTerminal;
