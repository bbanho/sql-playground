
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  initDb, runQuery, fetchScenarios, fetchMissions, 
  fetchCompletedMissionIds, saveProgress, loadScenarioEnvironment, 
  fetchSchema, generateErdData 
} from './services/db';
import MissionSidebar from './components/MissionSidebar';
import SqlEditor from './components/SqlEditor';
import ResultTable from './components/ResultTable';
import SchemaViewer from './components/SchemaViewer';
import ErdViewer from './components/ErdViewer';
import ConsoleTerminal from './components/ConsoleTerminal';
import StatusBar from './components/StatusBar';
import DebugWidget from './components/DebugWidget';
import { Mission, QueryResult, Scenario, FontSize, TableSchema, ErdNode, ErdEdge } from './types';

function App() {
  // System State
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);
  
  // Execution State
  const [userSql, setUserSql] = useState<string>('');
  const [userResult, setUserResult] = useState<QueryResult | null>(null);
  const [expectedResult, setExpectedResult] = useState<QueryResult | null>(null);
  const [userError, setUserError] = useState<boolean>(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' | 'loading' }>({ text: '', type: 'info' });
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTerminalMsg, setLastTerminalMsg] = useState('System Initialized');

  // UI/Preferences State
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>('text-sm');
  const [history, setHistory] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<number[]>([]);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [erdData, setErdData] = useState<{nodes: ErdNode[], edges: ErdEdge[]}>({ nodes: [], edges: [] });
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Right Panel State (Unified)
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [activeRightTab, setActiveRightTab] = useState<'schema' | 'erd'>('schema');
  const isResizingRef = useRef(false);

  // --- Effects & Initialization ---

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const loadSystem = async () => {
    setIsDbReady(false);
    try {
      await initDb();
      const loadedScenarios = await fetchScenarios();
      setScenarios(loadedScenarios);
      if (loadedScenarios.length > 0) await selectScenario(loadedScenarios[0]);
      setIsDbReady(true);
    } catch (err) {
      console.error("Critical System Error:", err);
    }
  };

  useEffect(() => { loadSystem(); }, []);

  const selectScenario = async (scenario: Scenario) => {
    await loadScenarioEnvironment(scenario.seedSql);
    const loadedMissions = await fetchMissions(scenario.id);
    setMissions(loadedMissions);
    const completed = await fetchCompletedMissionIds(scenario.id);
    setCompletedMissionIds(completed);
    
    // Load Meta
    const schemas = await fetchSchema();
    setSchema(schemas);
    const erd = await generateErdData(schemas);
    setErdData(erd);

    setActiveScenario(scenario);
    setCurrentMission(loadedMissions.length > 0 ? loadedMissions[0] : null);
    setUserSql('');
    setUserResult(null);
    setExpectedResult(null);
  };

  const handleSwitchScenario = async (scenarioId: string) => {
    const newScenario = scenarios.find(s => s.id === scenarioId);
    if (!newScenario || newScenario.id === activeScenario?.id) return;
    await selectScenario(newScenario);
  };

  // --- Layout Handlers ---

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingRef.current) {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(200, Math.min(newWidth, window.innerWidth - 300));
      setRightPanelWidth(clampedWidth);
      
      // Auto-collapse sidebar if things get too tight
      if (window.innerWidth - clampedWidth < 600) {
        setIsSidebarOpen(false);
      }
    }
  };

  const stopResizing = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = '';
  };

  // --- Execution Logic ---

  const handleExecute = useCallback(async () => {
    if (!isDbReady || !userSql.trim() || !activeScenario || !currentMission) return;
    setIsExecuting(true);
    setStatusMessage({ text: 'PROCESSANDO', type: 'loading' });
    
    // Add to history
    setHistory(prev => {
       const newHist = [userSql, ...prev.filter(h => h !== userSql)].slice(0, 15);
       return newHist;
    });

    try {
      const uRes = await runQuery(userSql);
      if ('error' in (uRes as any)) {
        setUserResult([uRes as any]);
        setUserError(true);
        setDbErrorMessage((uRes as any).error);
        setStatusMessage({ text: 'ERRO DE SINTAXE', type: 'error' });
        setLastTerminalMsg('Error: Syntax/Execution failed');
      } else {
        setUserResult(uRes as QueryResult);
        setUserError(false);
        const eRes = await runQuery(currentMission.expected);
        setExpectedResult(eRes as QueryResult);

        if (JSON.stringify(uRes) === JSON.stringify(eRes)) {
          setStatusMessage({ text: currentMission.successMessage.toUpperCase(), type: 'success' });
          await saveProgress(activeScenario.id, currentMission.id, userSql);
          setCompletedMissionIds(prev => prev.includes(currentMission.id) ? prev : [...prev, currentMission.id]);
          setLastTerminalMsg('Success: Mission Goal Achieved');
        } else {
          setStatusMessage({ text: 'RESULTADO INCORRETO', type: 'error' });
          setLastTerminalMsg('Executed: Result mismatch');
        }
      }
    } catch (e) {
      setStatusMessage({ text: 'ERRO DO SISTEMA', type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  }, [isDbReady, userSql, currentMission, activeScenario]);

  // --- Render ---

  if (!isDbReady || !activeScenario) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">BOOTSTRAPPING SQL ENGINE...</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ice-200 dark:bg-slate-950 font-sans">
      
      {/* 1. Main Content Area (Sidebar | Workspace | RightPanel) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT: Sidebar (Nav) */}
        <aside 
          className={`flex-shrink-0 z-30 transition-all duration-300 ease-in-out overflow-hidden bg-ice-100 dark:bg-slate-900 border-r border-ice-300 dark:border-slate-800 ${
            isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0'
          }`}
        >
          <MissionSidebar 
            scenarios={scenarios}
            activeScenarioId={activeScenario.id}
            onSwitchScenario={handleSwitchScenario}
            missions={missions} 
            currentMissionId={currentMission?.id} 
            onSelectMission={(id) => setCurrentMission(missions.find(m => m.id === id)!)} 
            fontSize={fontSize} 
            completedIds={completedMissionIds}
          />
        </aside>

        {/* CENTER: Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative bg-ice-200 dark:bg-slate-950">
          {/* Header (Simplified) */}
          <div className="bg-slate-900 text-white h-12 flex items-center justify-between px-4 border-b border-slate-700 flex-shrink-0 z-20 shadow-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-400 hover:text-white transition-colors focus:outline-none"
                title={isSidebarOpen ? "Ocultar Menu" : "Mostrar Menu"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              
              <div className="text-sm font-bold text-slate-400 hidden md:block border-l border-slate-700 pl-4 ml-2">
                 SQL WORKSPACE
              </div>
            </div>

            <div className="flex items-center gap-4">
               {/* Terminal Button */}
               <button 
                 onClick={() => setIsTerminalOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-sm text-xs font-mono text-green-400 transition-colors"
               >
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 TERMINAL
               </button>
            </div>
          </div>

          {/* Mission Info Bar */}
          <div className="bg-white dark:bg-slate-900 border-b border-ice-300 dark:border-slate-800 flex items-center justify-between shadow-sm px-4 py-2 min-h-[48px]">
             {currentMission && (
                <div className="truncate flex-1 pr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-blue-600 dark:text-blue-500 font-bold text-sm">#{currentMission.id}</span>
                    <span className="text-slate-800 dark:text-white font-bold text-sm truncate">{currentMission.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{currentMission.desc}</p>
                </div>
             )}
          </div>

          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
             {/* Top Half: Editor */}
             <div className="flex-[0.4] min-h-[150px] flex flex-col shadow-sm rounded-sm overflow-hidden border border-slate-300 dark:border-slate-700">
                <SqlEditor 
                    value={userSql} 
                    onChange={setUserSql} 
                    disabled={isExecuting} 
                    fontSize={fontSize}
                    history={history}
                    onSelectHistory={setUserSql}
                  />
                  <div className="bg-white dark:bg-slate-900 flex border-t border-slate-300 dark:border-slate-700">
                     <button onClick={handleExecute} disabled={isExecuting || !userSql.trim() || !currentMission} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors">
                        {isExecuting ? '...' : 'Executar'}
                      </button>
                      <div className={`flex-1 px-4 py-1.5 text-xs font-mono uppercase font-bold flex items-center ${
                          statusMessage.type === 'success' ? 'text-green-600 dark:text-green-400' :
                          statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' :
                          'text-slate-400'
                        }`}>
                         {statusMessage.text}
                      </div>
                  </div>
             </div>

             {/* Bottom Half: Results */}
             <div className="flex-[0.6] flex gap-2 min-h-0">
                <div className="flex-1 min-w-0"><ResultTable title="Seu Resultado" data={userResult} isError={userError} fontSize={fontSize} /></div>
                <div className="flex-1 min-w-0 hidden lg:block"><ResultTable title="Esperado" data={expectedResult} emptyMessage="..." fontSize={fontSize} /></div>
             </div>
          </div>
        </main>

        {/* RIGHT: Resizable Info Panel */}
        <div className="relative flex-shrink-0 flex z-40 bg-white dark:bg-slate-950 border-l border-slate-300 dark:border-slate-800" style={{ width: rightPanelWidth }}>
            {/* Resizer Handle */}
            <div 
               className="absolute left-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-50 transition-colors"
               onMouseDown={startResizing}
            ></div>

            <div className="flex-1 flex flex-col overflow-hidden">
               {/* Tabs */}
               <div className="flex border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <button 
                    onClick={() => setActiveRightTab('schema')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeRightTab === 'schema' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Schema
                  </button>
                  <button 
                    onClick={() => setActiveRightTab('erd')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeRightTab === 'erd' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Diagrama
                  </button>
               </div>
               
               {/* Content */}
               <div className="flex-1 overflow-hidden relative">
                  {activeRightTab === 'schema' ? (
                     <SchemaViewer schemas={schema} fontSize={fontSize} />
                  ) : (
                     <ErdViewer nodes={erdData.nodes} edges={erdData.edges} />
                  )}
               </div>
            </div>
        </div>

      </div>

      {/* 2. Bottom Status Bar (Global) */}
      <StatusBar 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onToggleTerminal={() => setIsTerminalOpen(true)}
        lastTerminalMsg={lastTerminalMsg}
        onToggleDebug={() => setIsDebugOpen(!isDebugOpen)}
        onSystemReset={() => loadSystem()}
        dbStatus={isDbReady ? 'ready' : 'loading'}
      />

      {/* 3. Floating/Modal Overlays */}
      <DebugWidget isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      <ConsoleTerminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
    </div>
  );
}

export default App;
