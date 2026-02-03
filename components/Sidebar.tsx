
import React from 'react';
import { ExitLog } from '../types';

interface SidebarProps {
  isOpen: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onClose: () => void;
  onOpenModal: (type: string) => void;
  lastExit?: ExitLog;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isDarkMode, toggleDarkMode, onClose, onOpenModal, lastExit, onLogout }) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] animate-in fade-in duration-300 no-print" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-80 flex flex-col p-8 gap-8 z-[70] transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-2xl no-print overflow-y-auto custom-scrollbar
        ${isDarkMode ? 'bg-slate-900 border-r border-slate-800 text-slate-200' : 'bg-white border-r border-slate-100 text-slate-800'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-600 rounded-2xl rotate-12 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/40">OC</div>
            <div className="flex flex-col">
              <span className="font-black text-[10px] uppercase tracking-tighter mono leading-tight">ORDEM DE</span>
              <span className="font-black text-xs uppercase tracking-widest mono text-cyan-500 leading-tight">CHEGADA</span>
            </div>
          </div>
          <button onClick={onClose} className="hover:text-cyan-500 transition-colors p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-2 shrink-0">
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] ml-2 mb-2">Entregadores</p>
          <SidebarButton onClick={() => onOpenModal('register')} label="Novo Cadastro" icon="plus-circle" color="cyan" />
          <SidebarButton onClick={() => onOpenModal('delete-driver')} label="Gestão de Banco" icon="database" color="slate" />

          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] ml-2 mt-6 mb-2">Monitoramento</p>
          <SidebarButton onClick={() => onOpenModal('remove-pos')} label="Excluir da Fila" icon="trash" color="red" />
          <SidebarButton onClick={() => onOpenModal('queue-frequency')} label="Frequência Hoje" icon="check-square" color="amber" />
          <SidebarButton onClick={() => onOpenModal('history-reports')} label="Relatórios" icon="file-text" color="indigo" />
          <SidebarButton onClick={() => onOpenModal('driver-productivity')} label="Produtividade" icon="chart-bar" color="emerald" />
        </nav>

        <div className="mt-auto flex flex-col gap-6 shrink-0 pt-4">
          {lastExit && (
            <div className={`p-5 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Última Atividade</span>
              </div>
              <p className="font-black text-base tracking-tight mb-3 truncate text-cyan-600">{lastExit.name}</p>
              <div className="flex flex-col gap-2 text-[9px] font-bold mono uppercase">
                <div className="flex justify-between items-center opacity-70">
                  <span className="opacity-50">Frota:</span>
                  <span>{lastExit.fleetNumber}</span>
                </div>
                <div className="flex justify-between items-center opacity-70">
                  <span className="opacity-50">Matrícula:</span>
                  <span>{lastExit.registration}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-500/10 pt-2 text-cyan-500">
                  <span className="opacity-50">DT:</span>
                  <span className="font-black">{lastExit.dtNumber || '---'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={toggleDarkMode}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:bg-cyan-500/5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest mono">Modo Noturno</span>
              <div className={`w-10 h-5 rounded-full relative transition-all ${isDarkMode ? 'bg-cyan-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </button>
            <button
              onClick={onLogout}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-red-500/10 hover:border-red-500/50 group ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 font-bold">⎋</div>
              <span className="text-[10px] font-black uppercase tracking-widest mono group-hover:text-red-500">Encerrar Sessão</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const SidebarButton: React.FC<{ onClick: () => void; label: string; icon: string; color: string }> = ({ onClick, label, icon, color }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'plus-circle': return '＋';
      case 'database': return '⛃';
      case 'trash': return '✕';
      case 'file-text': return '📑';
      case 'chart-bar': return '📊';
      case 'check-square': return '✓';
      default: return '●';
    }
  };

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 p-4 rounded-2xl transition-all hover:translate-x-2 text-left active:scale-95"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 ${color === 'cyan' ? 'bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white' :
        color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' :
          color === 'red' ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white' :
            color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white' :
              color === 'amber' ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' :
                'bg-slate-500/10 text-slate-500 group-hover:bg-slate-500 group-hover:text-white'
        }`}>
        <div className="text-xl font-bold">{getIcon(icon)}</div>
      </div>
      <span className="text-xs font-black uppercase tracking-widest mono truncate">{label}</span>
    </button>
  );
};

export default Sidebar;
