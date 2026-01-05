
import React, { useState } from 'react';
import { downloadDatabaseBackup, factoryReset, clearProgress } from '../services/db';

interface ConfigShelfProps {
  onResetComplete: () => void;
}

const ConfigShelf: React.FC<ConfigShelfProps> = ({ onResetComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBackup = async () => {
    setIsProcessing(true);
    await downloadDatabaseBackup();
    setIsProcessing(false);
  };

  const handleFactoryReset = async () => {
    if (window.confirm("⚠️ ATENÇÃO: Isso apagará TODOS os dados, missões customizadas e progresso. O sistema voltará ao estado original. Continuar?")) {
      setIsProcessing(true);
      await factoryReset();
      setIsProcessing(false);
      setIsOpen(false);
      onResetComplete();
    }
  };

  const handleClearProgress = async () => {
    if (window.confirm("Apagar apenas o seu progresso (checkmarks)? As missões permanecerão.")) {
      setIsProcessing(true);
      await clearProgress();
      setIsProcessing(false);
      setIsOpen(false);
      onResetComplete();
    }
  };

  return (
    <>
      {/* Trigger Icon */}
      <button 
        onClick={() => setIsOpen(true)}
        className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors p-1"
        title="Configurações do Sistema"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>

      {/* Modal/Shelf */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-sm w-full max-w-sm overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">Configuração do Sistema</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">✕</button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              
              {/* Standard Zone */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Manutenção</h4>
                <ul className="space-y-1">
                  <li>
                    <button 
                      onClick={handleBackup} 
                      disabled={isProcessing}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Backup Database (JSON)
                    </button>
                  </li>
                  <li>
                     <button 
                      onClick={handleClearProgress} 
                      disabled={isProcessing}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Limpar Meu Progresso
                    </button>
                  </li>
                </ul>
              </div>

              {/* Danger Zone Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setShowDanger(!showDanger)}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase flex items-center gap-1"
                >
                  {showDanger ? '▼ Ocultar Danger Zone' : '▶ Mostrar Danger Zone'}
                </button>
              </div>

              {/* Danger Zone Content */}
              {showDanger && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-sm">
                   <p className="text-[10px] text-red-600 dark:text-red-400 mb-2 leading-tight">
                     Ações irreversíveis. O reset de fábrica apagará cenários e missões customizadas criadas via SQL.
                   </p>
                   <button 
                      onClick={handleFactoryReset} 
                      disabled={isProcessing}
                      className="w-full text-center px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-sm shadow-sm"
                    >
                      FACTORY RESET (TUDO)
                    </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigShelf;
