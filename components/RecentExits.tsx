
import React, { useState } from 'react';
import { ExitLog } from '../types';

interface RecentExitsProps {
  logs: ExitLog[];
  isDarkMode: boolean;
  onAdjustVolume: (id: string, currentVal: number, delta: number) => void;
}

const RecentExits: React.FC<RecentExitsProps> = ({ logs, isDarkMode, onAdjustVolume }) => {
  // Mantém apenas as 4 últimas saídas conforme solicitado
  const recentLogs = logs.slice(0, 4);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (!text || text === '---') return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(`DT COPIADA!`);
      setTimeout(() => setCopyFeedback(null), 1500);
    });
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return 'Sem registro';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Hora inválida';

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${time} | ${day}/${month}`;
  };

  return (
    <div className={`flex flex-col gap-4 h-full animate-in fade-in slide-in-from-bottom-4 duration-1000 relative`}>
      {copyFeedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in zoom-in duration-200">
          {copyFeedback}
        </div>
      )}

      <div className="flex items-center gap-2 px-2 shrink-0">
        <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mono">Últimas saídas</h3>
      </div>

      <div className="flex flex-col gap-3 overflow-hidden pr-1">
        {recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <div
              key={log.id}
              className={`p-5 rounded-[28px] border transition-all hover:border-cyan-500/50 relative overflow-hidden group ${isDarkMode
                ? 'bg-slate-900/80 border-white/5 shadow-2xl shadow-cyan-900/5'
                : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}
            >
              {/* Header: Nome e Badge de Tempo */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`font-black text-base tracking-tight truncate max-w-[160px] uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.name}</span>
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black mono whitespace-nowrap shadow-sm ${isDarkMode ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                  {formatDateTime(log.exitTime)}
                </span>
              </div>

              {/* Body: DT e Volume */}
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(log.dtNumber)}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-2xl border transition-all active:scale-95 ${isDarkMode
                      ? 'bg-slate-950 border-white/5 hover:bg-white/5'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                    <span className="text-[11px] font-black mono text-slate-500 uppercase flex items-center gap-2">
                      <span className="opacity-40">DT:</span> {log.dtNumber || '---'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-20 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>

                  {/* Badge de Volume - Com controles de ajuste */}
                  <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm shrink-0 min-w-[90px] justify-between ${isDarkMode
                    ? 'bg-slate-800/60 border-cyan-500/30 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-50 block mb-0.5">VOL</span>
                      <span className="text-base font-black mono leading-none">{log.ordersCount || 0}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onAdjustVolume(log.id, log.ordersCount, 1)}
                        className={`w-5 h-5 flex items-center justify-center rounded-md text-xs font-black transition-all active:scale-90 ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-600 hover:text-white'}`}
                      >
                        +
                      </button>
                      <button
                        onClick={() => onAdjustVolume(log.id, log.ordersCount, -1)}
                        className={`w-5 h-5 flex items-center justify-center rounded-md text-xs font-black transition-all active:scale-90 ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-red-600 hover:text-white'}`}
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                {/* Zona/Destino */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <span className={`text-[10px] font-black truncate uppercase tracking-tight opacity-70 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{log.zone}</span>
                </div>
              </div>

              {/* Background Decor */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div className={`p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/20 opacity-30' : 'border-slate-200 bg-slate-50 opacity-50'
            }`}>
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center opacity-40">Aguardando dados...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentExits;
