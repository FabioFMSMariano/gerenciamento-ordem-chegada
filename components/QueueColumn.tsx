
import React, { useState, useEffect, useCallback } from 'react';
import { QueueEntry, Period } from '../types';

interface QueueColumnProps {
  period: Period;
  queue: QueueEntry[];
  isDarkMode: boolean;
  onAddClick: () => void;
  onExitClick: (driver: QueueEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onUpdate: (driver: QueueEntry) => void;
  onReorder: (newList: QueueEntry[]) => void;
}

const QueueColumn: React.FC<QueueColumnProps> = ({
  period,
  queue,
  isDarkMode,
  onAddClick,
  onExitClick,
  onRemove,
  onReorder
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, driver: QueueEntry } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCopy = useCallback((text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(`${label} COPIADO!`);
      setTimeout(() => setCopyFeedback(null), 1500);
    });
  }, []);

  const handleContextMenu = (e: React.MouseEvent, driver: QueueEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, driver });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) {
      setDraggedItemIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newList = [...queue];
    const itemToMove = newList.splice(draggedItemIndex, 1)[0];
    newList.splice(index, 0, itemToMove);

    onReorder(newList);
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  const moveToTop = (driver: QueueEntry) => {
    const filtered = queue.filter(q => q.queueId !== driver.queueId);
    onReorder([driver, ...filtered]);
    setContextMenu(null);
  };

  const moveUp = (driver: QueueEntry) => {
    const index = queue.findIndex(q => q.queueId === driver.queueId);
    if (index > 0) {
      const newList = [...queue];
      const temp = newList[index];
      newList[index] = newList[index - 1];
      newList[index - 1] = temp;
      onReorder(newList);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const periodColors = period === Period.MORNING
    ? { text: 'text-amber-400', bg: 'bg-amber-500', glow: 'shadow-amber-500/30' }
    : { text: 'text-purple-400', bg: 'bg-purple-600', glow: 'shadow-purple-600/30' };

  return (
    <div className="w-full flex flex-col gap-6">
      {copyFeedback && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-cyan-600 text-white px-8 py-3 rounded-2xl text-xs font-black animate-in fade-in slide-in-from-top duration-300 shadow-2xl border border-white/20">
          {copyFeedback}
        </div>
      )}

      <div className={`p-8 rounded-[40px] border-2 transition-all ${isDarkMode ? 'bg-slate-900/60 border-white/5 shadow-2xl' : 'bg-slate-50/80 border-slate-200 shadow-xl'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${periodColors.bg} animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]`} />
            <h2 className={`text-2xl font-black uppercase tracking-[0.2em] mono ${periodColors.text}`}>{period}</h2>
          </div>
          <button onClick={onAddClick} className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-cyan-500 text-white shadow-lg'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 min-h-[400px]">
          {queue.length > 0 ? (
            queue.map((driver, index) => {
              const isFirst = index === 0;
              const isOver = dragOverIndex === index;
              const isDragging = draggedItemIndex === index;
              const isMorning = period === Period.MORNING;

              const firstItemStyle = isFirst
                ? (isMorning
                  ? (isDarkMode
                    ? 'bg-blue-900/40 border-blue-500/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                    : 'bg-blue-600 border-blue-500 text-white shadow-lg')
                  : (isDarkMode
                    ? 'bg-emerald-900/40 border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                    : 'bg-emerald-500 border-emerald-400 text-white shadow-lg')
                )
                : (isDarkMode
                  ? 'bg-slate-900 border-white/5 hover:border-cyan-500/30 text-slate-100'
                  : 'bg-white border-slate-200 hover:border-cyan-400 shadow-sm text-slate-900');

              return (
                <div
                  key={driver.queueId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  onContextMenu={(e) => handleContextMenu(e, driver)}
                  className={`
                    group relative transition-all duration-300 cursor-grab active:cursor-grabbing
                    ${isOver ? (isDarkMode ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]' : 'border-cyan-400 scale-[1.02]') : ''}
                    ${isDragging ? 'opacity-20 scale-95' : 'opacity-100'}
                  `}
                >
                  <div className={`group px-6 py-4 rounded-2xl flex items-center justify-between transition-all border-2 ${firstItemStyle}`}>
                    <div className="flex gap-6 items-center flex-1 truncate">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 mono 
                        ${isFirst
                          ? 'bg-white/20 text-white'
                          : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                        }`}>
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="flex flex-col truncate">
                        <span className={`font-black text-lg tracking-tighter truncate leading-none transition-colors uppercase
                          ${isFirst ? 'text-white' : 'group-hover:text-cyan-400'}
                        `}>
                          {driver.name}
                        </span>
                        <div className={`text-[10px] uppercase font-black mono flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 
                          ${isFirst ? 'text-white/70' : 'opacity-50'}`}>
                          <span onClick={(e) => { e.stopPropagation(); handleCopy(driver.fleetNumber, 'FROTA'); }} className="hover:underline cursor-pointer">F: {driver.fleetNumber}</span>
                          <span onClick={(e) => { e.stopPropagation(); handleCopy(driver.registration, 'MATRÍCULA'); }} className="hover:underline cursor-pointer">M: {driver.registration}</span>
                          <span className={isFirst ? (isMorning ? 'text-zinc-200' : 'text-zinc-300') : 'text-zinc-500'}>{driver.company}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isFirst ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExitClick(driver); }}
                            className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-md active:scale-95 shrink-0
                              ${isMorning
                                ? (isDarkMode ? 'bg-white text-zinc-950 hover:bg-zinc-50' : 'bg-white text-zinc-600 hover:bg-zinc-50')
                                : (isDarkMode ? 'bg-white text-zinc-950 hover:bg-zinc-50' : 'bg-white text-zinc-600 hover:bg-zinc-50')
                              }`}
                          >
                            SAÍDA
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`opacity-20 group-hover:opacity-40 transition-opacity`}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="4" cy="4" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="4" cy="12" r="1.5" />
                              <circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="8" r="1.5" /><circle cx="12" cy="12" r="1.5" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`h-40 border-2 border-dashed rounded-[32px] flex items-center justify-center font-black italic text-sm uppercase opacity-40 ${isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50'}`}>
              Fila Vazia
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-[9999] shadow-2xl rounded-2xl overflow-hidden border backdrop-blur-xl animate-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col min-w-[220px]">
            <div className={`px-6 py-3 border-b text-[9px] font-black uppercase tracking-widest opacity-40 ${isDarkMode ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              Comandos de Fila
            </div>
            <ContextButton onClick={() => moveToTop(contextMenu.driver)} icon="⇑" label="Prioridade Total" isDarkMode={isDarkMode} />
            <ContextButton onClick={() => moveUp(contextMenu.driver)} icon="↑" label="Subir 1 Posição" isDarkMode={isDarkMode} />
            <ContextButton
              onClick={() => { if (confirm(`Remover ${contextMenu.driver.name} da fila?`)) onRemove(contextMenu.driver.queueId); setContextMenu(null); }}
              icon="✕" label="Remover da Fila" color="red" isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ContextButton: React.FC<{ onClick: () => void; icon: string; label: string; color?: string; isDarkMode: boolean }> = ({ onClick, icon, label, color, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-slate-900 hover:bg-white/5 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
      } ${color === 'red' ? 'text-red-500' : ''}`}
  >
    <span className="w-5 flex justify-center text-sm">{icon}</span> {label}
  </button>
);

export default QueueColumn;
