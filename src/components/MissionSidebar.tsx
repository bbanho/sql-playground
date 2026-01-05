
import React from 'react';
import { Mission, FontSize, Scenario } from '../types';
import { Logo } from './Logo';

interface MissionSidebarProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSwitchScenario: (id: string) => void;
  missions: Mission[];
  currentMissionId: number | undefined;
  onSelectMission: (id: number) => void;
  fontSize: FontSize;
  completedIds: number[];
}

const MissionSidebar: React.FC<MissionSidebarProps> = ({ 
  scenarios, 
  activeScenarioId, 
  onSwitchScenario, 
  missions, 
  currentMissionId, 
  onSelectMission, 
  fontSize, 
  completedIds 
}) => {
  const progress = missions.length > 0 ? Math.round((completedIds.length / missions.length) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-ice-100 dark:bg-slate-900 border-r border-ice-300 dark:border-slate-800 transition-colors duration-200">
      
      {/* Navigation List (Accordion Style) */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-ice-300 dark:scrollbar-thumb-slate-700 py-2">
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeScenarioId;
          
          return (
            <div key={scenario.id} className="mb-1">
              {/* Scenario Header (Accordion Trigger) */}
              <button
                onClick={() => onSwitchScenario(scenario.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-l-4 ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 border-blue-500 text-slate-800 dark:text-slate-100 shadow-sm' 
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-ice-200 dark:hover:bg-slate-800/50'
                }`}
              >
                 <span className="text-xs font-bold uppercase tracking-wider truncate">{scenario.name}</span>
                 <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* Missions List (Expanded Content) */}
              {isActive && (
                <div className="bg-ice-50 dark:bg-slate-900/50 pb-2">
                  {missions.map((m, index) => {
                    const isMissionActive = m.id === currentMissionId;
                    const isCompleted = completedIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => onSelectMission(m.id)}
                        className={`group w-full text-left px-4 py-2 border-l-4 border-transparent transition-all duration-75 ${fontSize} ${
                          isMissionActive
                            ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/10 border-l-blue-600 dark:border-l-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-ice-100 dark:hover:bg-slate-800'
                        }`}
                        style={{ paddingLeft: '1.5rem' }}
                      >
                        <div className="flex items-start gap-2.5">
                           <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isCompleted ? 'bg-green-500' : (isMissionActive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600')
                           }`}></div>
                           <span className={`block leading-tight ${isMissionActive ? '' : 'opacity-90'}`}>
                              {m.title}
                           </span>
                        </div>
                      </button>
                    );
                  })}
                  {missions.length === 0 && (
                      <div className="px-6 py-3 text-xs text-slate-400 italic">Nenhuma missão encontrada.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer: Logo & Progress */}
      <div className="bg-white dark:bg-slate-950 border-t border-ice-300 dark:border-slate-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {/* Progress Bar (Mini) */}
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
             <span>Progresso</span>
             <span>{progress}%</span>
          </div>
          <div className="w-full h-1 bg-ice-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>

          {/* Logo Section */}
          <div className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity select-none">
             <Logo className="w-8 h-8 text-blue-600" />
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest leading-none mb-0.5">Research</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest leading-none">SQL Trainer</span>
             </div>
          </div>
      </div>
    </div>
  );
};

export default MissionSidebar;
