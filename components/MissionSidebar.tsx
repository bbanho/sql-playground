
import React from 'react';
import { Mission, FontSize } from '../types';
import { Logo } from './Logo';

interface MissionSidebarProps {
  missions: Mission[];
  currentId: number | undefined;
  onSelect: (id: number) => void;
  fontSize: FontSize;
  completedIds: number[];
}

const MissionSidebar: React.FC<MissionSidebarProps> = ({ missions, currentId, onSelect, fontSize, completedIds }) => {
  const progress = missions.length > 0 ? Math.round((completedIds.length / missions.length) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-ice-100 dark:bg-slate-900 border-r border-ice-300 dark:border-slate-800 transition-colors duration-200">
      {/* Header */}
      <div className="p-3 border-b border-ice-300 dark:border-slate-800 bg-ice-200 dark:bg-slate-950 flex items-center gap-3">
        <Logo className="w-8 h-8 shadow-sm" />
        <div>
           <h1 className="text-[10px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none mb-0.5">Research</h1>
           <h2 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">SQL Trainer</h2>
        </div>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700">
        <div className="flex flex-col">
          {missions.map((m, index) => {
            const isActive = m.id === currentId;
            const isCompleted = completedIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`group w-full text-left px-4 py-3 border-b border-ice-200 dark:border-slate-800/50 transition-all duration-75 ${fontSize} ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-ice-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-ice-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center font-mono text-[10px] w-6 h-5 rounded-none border ${
                    isActive 
                      ? 'bg-blue-500 border-blue-400 text-white' 
                      : (isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
                          : 'bg-ice-200 dark:bg-slate-800 border-ice-300 dark:border-slate-700 text-slate-500 dark:text-slate-500')
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      (index + 1).toString().padStart(2, '0')
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`font-bold block truncate ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {m.title}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Progress Footer */}
      <div className="bg-ice-200 dark:bg-slate-950 border-t border-ice-300 dark:border-slate-800 p-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
            <span>PROGRESSO DA SESSÃO</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-ice-300 dark:bg-slate-800 rounded-none overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
      </div>
    </div>
  );
};

export default MissionSidebar;
