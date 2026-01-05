
import React, { useEffect, useState, useRef } from 'react';
import { FontSize } from '../types';
import { validateQuery } from '../services/db';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  fontSize: FontSize;
  history: string[];
  onSelectHistory: (sql: string) => void;
}

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, disabled, fontSize, history, onSelectHistory }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Real-time Validation Effect
  useEffect(() => {
    if (!value.trim()) {
      setSyntaxError(null);
      return;
    }

    setIsValidating(true);
    // Clear previous timeout
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    // Debounce validation by 600ms to avoid checking while typing fast
    debounceRef.current = window.setTimeout(async () => {
      const error = await validateQuery(value);
      setSyntaxError(error);
      setIsValidating(false);
    }, 600);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Extract concise error info
  const getErrorDisplay = () => {
    if (!syntaxError) return null;
    
    // Check for "Table does not exist"
    if (syntaxError.includes("Table with name") && syntaxError.includes("does not exist")) {
       const match = syntaxError.match(/Table with name ([^ ]+) does not exist/);
       return `Tabela Inexistente: ${match ? match[1] : 'Verifique o schema'}`;
    }

    // Check for Syntax Error position
    const lineMatch = syntaxError.match(/line ([0-9]+)/);
    // const colMatch = syntaxError.match(/column ([0-9]+)/); // DuckDB sometimes gives character index instead of col
    if (lineMatch) {
       return `Erro de Sintaxe (Linha ${lineMatch[1]}): Verifique a estrutura da query`;
    }

    return "Erro de Sintaxe: Verifique seu código";
  };

  const errorMessage = getErrorDisplay();

  return (
    <div className={`w-full h-full flex flex-col border bg-ice-100 dark:bg-slate-950 shadow-sm transition-colors duration-300 ${
        errorMessage ? 'border-red-400 dark:border-red-800' : 'border-ice-300 dark:border-slate-700'
    }`}>
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-ice-200 dark:bg-slate-900 border-b border-ice-300 dark:border-slate-700 relative">
        <div className="flex items-center gap-2">
           <svg className={`w-3.5 h-3.5 ${errorMessage ? 'text-red-500' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">Editor SQL</span>
        </div>
        
        {/* History Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            disabled={history.length === 0}
            className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Histórico
          </button>
          
          {showHistory && (
            <div className="absolute right-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-xl z-50 rounded-sm">
              {history.map((h, i) => (
                <button 
                  key={i}
                  onClick={() => { onSelectHistory(h); setShowHistory(false); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 hover:bg-ice-100 dark:hover:bg-slate-700 truncate"
                  title={h}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          {showHistory && <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)}></div>}
        </div>
      </div>

      {/* Text Area */}
      <div className="relative flex-1 bg-ice-100 dark:bg-slate-950">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="-- Digite sua query SQL aqui..."
          className={`w-full h-full p-4 font-mono leading-relaxed bg-ice-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 resize-none outline-none border-none placeholder-slate-400 dark:placeholder-slate-600 scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700 ${fontSize}`}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      
      {/* Status Bar */}
      <div className={`px-3 py-1.5 border-t flex justify-between items-center text-[10px] font-mono transition-colors ${
          errorMessage 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400' 
          : 'bg-ice-200 dark:bg-slate-900 border-ice-300 dark:border-slate-700 text-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          {isValidating && <span className="animate-pulse">Validando...</span>}
          {!isValidating && errorMessage && (
            <span className="flex items-center gap-1 font-bold">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               {errorMessage}
            </span>
          )}
          {!isValidating && !errorMessage && <span>Ln {value.split('\n').length}, Col {value.length}</span>}
        </div>
        
        <span className={disabled ? 'text-amber-600 dark:text-amber-500 font-bold' : (errorMessage ? 'text-red-500 font-bold' : 'text-blue-600 dark:text-blue-500 font-bold')}>
          {disabled ? 'EXECUTANDO...' : (errorMessage ? 'ERRO DETECTADO' : 'PRONTO')}
        </span>
      </div>
    </div>
  );
};

export default SqlEditor;
