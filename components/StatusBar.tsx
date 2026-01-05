
import React from 'react';
import { FontSize } from '../types';
import ConfigShelf from './ConfigShelf';

interface StatusBarProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  onToggleTerminal: () => void;
  lastTerminalMsg: string;
  onToggleDebug: () => void;
  onSystemReset: () => void;
  dbStatus: 'ready' | 'loading' | 'error';
}

const StatusBar: React.FC<StatusBarProps> = ({ 
  darkMode, setDarkMode, fontSize, setFontSize, 
  onToggleTerminal, lastTerminalMsg, onToggleDebug, onSystemReset, dbStatus
}) => {
  return (
    <div className="h-8 bg-ice-300 dark:bg-slate-900 border-t border-ice-300 dark:border-slate-800 flex items-center justify-between px-2 select-none z-50">
      
      {/* LEFT: System Controls */}
      <div className="flex items-center gap-3">
        <ConfigShelf onResetComplete={onSystemReset} />
        
        <div className="h-4 w-px bg-slate-400 dark:bg-slate-700"></div>

        {/* Theme Toggle */}
        <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600">
          {darkMode ? (
             <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> LIGHT</>
          ) : (
             <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> DARK</>
          )}
        </button>

        <div className="h-4 w-px bg-slate-400 dark:bg-slate-700"></div>

        {/* Font Size */}
        <div className="flex gap-0.5">
           {(['text-xs', 'text-sm', 'text-base'] as FontSize[]).map(s => (
             <button key={s} onClick={() => setFontSize(s)} className={`w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-sm ${fontSize === s ? 'bg-slate-600 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>A</button>
           ))}
        </div>
      </div>

      {/* CENTER: DB Status (Visual filler) */}
      <div className="flex items-center gap-2">
         <span className={`flex h-2 w-2 rounded-full ${dbStatus === 'ready' ? 'bg-green-500' : (dbStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500')}`}></span>
         <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            DuckDB-WASM {dbStatus === 'ready' ? 'Connected' : dbStatus}
         </span>
      </div>

      {/* RIGHT: Terminal & Debug */}
      <div className="flex items-center gap-2 h-full py-1">
        
        {/* Debug Toggle */}
        <button onClick={onToggleDebug} className="px-2 h-full flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-ice-200 dark:hover:bg-slate-800 rounded-sm" title="Open Debug Widget">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        {/* Terminal Status Rect */}
        <button 
            onClick={onToggleTerminal}
            className="h-full bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-sm flex items-center gap-2 min-w-[200px] max-w-[300px]"
        >
            <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[10px] font-bold">TERMINAL</span>
            </div>
            <div className="h-3 w-px bg-slate-600"></div>
            <span className="text-[10px] font-mono text-slate-400 truncate flex-1 text-left">
                {lastTerminalMsg || 'Ready'}
            </span>
        </button>
      </div>

    </div>
  );
};

export default StatusBar;
