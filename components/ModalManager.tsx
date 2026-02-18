
import React, { useState, useMemo, useEffect, useCallback, startTransition, Suspense } from 'react';
import { Driver, Period, QueueEntry, ExitLog } from '../types';
import { supabase } from '../lib/supabase';
import { Chart as ChartJS, registerables, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun } from 'docx';

if (typeof window !== 'undefined') {
  ChartJS.register(...registerables);
}

const ZONES_LIST = ["NORTE", "OESTE", "CENTRO OESTE", "CENTRO SUL", "SUL", "LESTE"];

interface ModalManagerProps {
  type: string | null;
  period: Period;
  drivers: Driver[];
  exitLogs: ExitLog[];
  isDarkMode: boolean;
  editingDriver: QueueEntry | null;
  morningQueue: QueueEntry[];
  afternoonQueue: QueueEntry[];
  securityChallenge: { code: string; expiresAt: number } | null;
  onClose: () => void;
  onRegisterDriver: (d: Driver) => void;
  onUpdateDriver?: (d: Driver) => void;
  onDeleteDriverFromDB: (id: string) => void;
  onClearDriverLogs?: (id: string) => void;
  onClearAllOperationalData?: () => void;
  onAddToQueue: (d: Driver, p: Period) => void;
  onConfirmExit: (log: Omit<ExitLog, 'id' | 'date' | 'exitTime'>) => void;
  onReorder: (newList: QueueEntry[], p: Period) => void;
  onRemoveByPosition?: (pos: number, p: Period) => void;
  onConfirmSecurityPurge?: () => void;
}

/* --- UTILITÁRIOS DE EXPORTAÇÃO --- */

const downloadFile = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

const exportDataToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const exportDataToCSV = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${fileName}.csv`);
};

const ModalManager: React.FC<ModalManagerProps> = (props) => {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!props.type || props.type === 'login') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-lg p-4 no-print animate-in fade-in duration-300">
      <div className={`relative w-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col border transition-all duration-300 
        ${isMaximized ? 'max-w-[98vw] h-[95vh]' : 'max-w-xl max-h-[95vh]'} 
        ${['driver-productivity', 'history-reports', 'queue-frequency'].includes(props.type) ? 'max-w-7xl' : ''} 
        ${props.isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'}`}>

        <div className="px-8 py-6 flex justify-between items-center border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tighter">
              {props.type === 'register' && 'Novo Cadastro'}
              {props.type === 'delete-driver' && 'Base de Entregadores'}
              {props.type === 'include' && `Fila: ${props.period}`}
              {props.type === 'exit' && 'Protocolo de Saída'}
              {props.type === 'daily-report' && 'Relatório do Dia'}
              {props.type === 'history-reports' && 'Histórico de Arquivos'}
              {props.type === 'remove-pos' && 'Exclusão de Posição'}
              {props.type === 'register-operator' && 'Cadastrar Usuário'}
              {props.type === 'driver-productivity' && 'Métricas de Produtividade'}
              {props.type === 'queue-frequency' && 'Frequência de Fila (Hoje)'}
              {props.type === 'register-tenant' && 'Novo Inquilino / Workspace'}
              {props.type === 'security-challenge' && '🔒 Acesso Restrito'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMaximized(!isMaximized)} className="p-3 rounded-full hover:bg-white/5 text-slate-400 hover:text-cyan-500 transition-colors">
              {isMaximized ? '⇙' : '⇗'}
            </button>
            <button onClick={props.onClose} className="p-3 rounded-full hover:bg-white/5 text-slate-400 hover:text-red-500 transition-colors">✕</button>
          </div>
        </div>

        <div className={`overflow-y-auto flex-1 custom-scrollbar p-8`}>
          <Suspense fallback={<div className="flex items-center justify-center h-40 font-black animate-pulse text-cyan-500">CARREGANDO...</div>}>
            {props.type === 'register' && <RegisterDriverForm isDarkMode={props.isDarkMode} onSave={props.onRegisterDriver} />}
            {props.type === 'delete-driver' && <DeleteDriverView isDarkMode={props.isDarkMode} drivers={props.drivers} onUpdate={props.onUpdateDriver} onDelete={props.onDeleteDriverFromDB} />}
            {props.type === 'include' && <IncludeInQueue isDarkMode={props.isDarkMode} drivers={props.drivers} onSelect={(d) => props.onAddToQueue(d, props.period)} />}
            {props.type === 'exit' && props.editingDriver && <ExitForm isDarkMode={props.isDarkMode} driver={props.editingDriver} period={props.period} onConfirm={props.onConfirmExit} />}
            {props.type === 'daily-report' && <ReportView logs={props.exitLogs.filter(l => l.date === new Date().toISOString().split('T')[0])} />}
            {props.type === 'history-reports' && <HistoryReportView isDarkMode={props.isDarkMode} />}
            {props.type === 'remove-pos' && <RemoveByPositionForm isDarkMode={props.isDarkMode} onConfirm={props.onRemoveByPosition || (() => { })} />}
            {props.type === 'register-operator' && <RegisterOperatorForm isDarkMode={props.isDarkMode} />}
            {props.type === 'driver-productivity' && <DriverProductivityView isDarkMode={props.isDarkMode} drivers={props.drivers} />}
            {props.type === 'queue-frequency' && <QueueFrequencyView isDarkMode={props.isDarkMode} morningQueue={props.morningQueue} afternoonQueue={props.afternoonQueue} logs={props.exitLogs} />}
            {props.type === 'register-tenant' && <RegisterTenantForm isDarkMode={props.isDarkMode} onSave={() => props.onClose()} />}
            {props.type === 'security-challenge' && props.securityChallenge && (
              <SecurityChallengeView
                isDarkMode={props.isDarkMode}
                challenge={props.securityChallenge}
                onSuccess={props.onConfirmSecurityPurge || (() => { })}
                onRetry={props.onClearAllOperationalData || (() => { })}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ModalManager;

/* --- SUB-COMPONENTS --- */

const HistoryReportView: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [filter, setFilter] = useState('');
  const [logs, setLogs] = useState<ExitLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exit_logs')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('exit_time', { ascending: false });

    if (data && !error) {
      setLogs(data.map((l: any) => ({
        id: l.id,
        driverId: l.driver_id,
        name: l.name,
        fleetNumber: l.fleet_number,
        registration: l.registration,
        company: l.company,
        zone: l.zone,
        dtNumber: l.dt_number,
        ordersCount: l.orders_count,
        exitTime: l.exit_time,
        period: l.period as Period,
        date: l.date
      })));
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAdjustVolume = async (id: string, currentVal: number, delta: number) => {
    const newVal = Math.max(0, currentVal + delta);
    const { error } = await supabase.from('exit_logs').update({ orders_count: newVal }).eq('id', id);
    if (!error) {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, ordersCount: newVal } : l));
    } else {
      alert('Erro ao atualizar volume.');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    const { error } = await supabase.from('exit_logs').delete().eq('id', id);
    if (!error) {
      setLogs(prev => prev.filter(l => l.id !== id));
    } else {
      alert('Erro ao excluir registro.');
    }
  };

  const filtered = useMemo(() => {
    return logs.filter(l => {
      return l.name.toLowerCase().includes(filter.toLowerCase()) ||
        l.dtNumber.toLowerCase().includes(filter.toLowerCase()) ||
        l.zone.toLowerCase().includes(filter.toLowerCase());
    });
  }, [logs, filter]);

  const getExportData = () => filtered.map(l => ({
    "Data": formatDateBR(l.date),
    "Hora": new Date(l.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    "Nome": l.name,
    "Frota": l.fleetNumber,
    "Matrícula": l.registration,
    "Zona": l.zone,
    "DT": l.dtNumber,
    "Volume": l.ordersCount
  }));

  const handleExportExcel = () => exportDataToExcel(getExportData(), `Historico_${startDate}_a_${endDate}`);
  const handleExportCSV = () => exportDataToCSV(getExportData(), `Historico_${startDate}_a_${endDate}`);

  const handleExportWord = async () => {
    const data = getExportData();
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: "HISTÓRICO DE ARQUIVOS", bold: true, size: 32, color: "71717a" })],
            alignment: AlignmentType.CENTER, spacing: { after: 400 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["DATA", "NOME", "FROTA", "MATR.", "ZONA", "DT", "VOL"].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "71717a" })], alignment: AlignmentType.CENTER })]
                  })
                ),
              }),
              ...data.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(item.Data)] }),
                  new TableCell({ children: [new Paragraph(item.Nome)] }),
                  new TableCell({ children: [new Paragraph(item.Frota)] }),
                  new TableCell({ children: [new Paragraph(item.Matrícula)] }),
                  new TableCell({ children: [new Paragraph(item.Zona)] }),
                  new TableCell({ children: [new Paragraph(item.DT)] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun(item.Volume.toString())], alignment: AlignmentType.CENTER })] }),
                ]
              }))
            ]
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    downloadFile(blob, `Historico_${startDate}_a_${endDate}.docx`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className={`p-8 rounded-[32px] border flex flex-col gap-6 ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">De</label>
            <input type="date" className={`p-4 rounded-xl border font-black mono text-xs ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-white border-slate-200'}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Até</label>
            <input type="date" className={`p-4 rounded-xl border font-black mono text-xs ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-white border-slate-200'}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <input
          placeholder="BUSCAR POR ENTREGADOR, DT OU ZONA..."
          className={`p-5 rounded-2xl border font-black uppercase tracking-tighter outline-none ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleExportExcel} className="flex-1 bg-emerald-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-2">📊 EXCEL</button>
          <button onClick={handleExportCSV} className="flex-1 bg-emerald-700 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 flex items-center justify-center gap-2">📄 CSV</button>
          <button onClick={handleExportWord} className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 flex items-center justify-center gap-2">📝 WORD</button>
        </div>
      </div>

      <div className={`border rounded-[28px] overflow-hidden ${isDarkMode ? 'border-white/5 bg-slate-900/40' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'} text-[10px] font-black uppercase tracking-widest opacity-60`}>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Frota</th>
                <th className="px-6 py-4">Matrícula</th>
                <th className="px-6 py-4">Zona</th>
                <th className="px-6 py-4">DT</th>
                <th className="px-6 py-4 text-center">Volume</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(l => (
                <tr key={l.id} className={`hover:bg-cyan-500/5 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <td className="px-6 py-4 mono text-[10px]">{formatDateBR(l.date)}</td>
                  <td className="px-6 py-4 font-black uppercase text-xs">{l.name}</td>
                  <td className="px-6 py-4 font-black mono text-[10px] opacity-70">{l.fleetNumber}</td>
                  <td className="px-6 py-4 font-black mono text-[10px] opacity-70">{l.registration}</td>
                  <td className="px-6 py-4 uppercase text-[10px] opacity-70">{l.zone}</td>
                  <td className="px-6 py-4 font-black mono text-cyan-500 text-[10px]">{l.dtNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => handleAdjustVolume(l.id, l.ordersCount, -1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-black transition-all active:scale-90 ${isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'
                          }`}
                      >
                        -
                      </button>

                      <span className="font-black text-sm min-w-[20px] text-center">{l.ordersCount}</span>

                      <button
                        onClick={() => handleAdjustVolume(l.id, l.ordersCount, 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-black transition-all active:scale-90 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white border border-slate-200'
                          }`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleDeleteLog(l.id)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDarkMode
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                          : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100'
                          }`}
                        title="Excluir Registro"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DriverProductivityView: React.FC<{ isDarkMode: boolean; drivers: Driver[] }> = ({ isDarkMode, drivers }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [historicalLogs, setHistoricalLogs] = useState<ExitLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supabase.from('exit_logs').select('*').eq('driver_id', selectedId).order('exit_time', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setHistoricalLogs(data.map((l: any) => ({
            ...l,
            ordersCount: l.orders_count,
            fleetNumber: l.fleet_number,
            driverId: l.driver_id,
            exitTime: l.exit_time,
            period: l.period as Period,
            date: l.date,
            registration: l.registration
          })));
        }
        setLoading(false);
      });
  }, [selectedId]);

  const driver = drivers.find(d => d.id === selectedId);
  const filteredLogs = useMemo(() => historicalLogs.filter(log => log.date >= startDate && log.date <= endDate), [historicalLogs, startDate, endDate]);

  const zoneFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      counts[log.zone] = (counts[log.zone] || 0) + 1;
    });
    return counts;
  }, [filteredLogs]);

  const stats = {
    exits: filteredLogs.length,
    volume: filteredLogs.reduce((a, b) => a + b.ordersCount, 0),
    avg: (filteredLogs.reduce((a, b) => a + b.ordersCount, 0) / (filteredLogs.length || 1)).toFixed(1)
  };

  const getExportData = () => filteredLogs.map(l => ({
    "Data": formatDateBR(l.date),
    "Hora": new Date(l.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    "Nome": l.name,
    "Frota": l.fleetNumber,
    "Matrícula": l.registration,
    "Zona": l.zone,
    "Frequência na Zona": zoneFrequencies[l.zone] || 0,
    "Volume": l.ordersCount
  }));

  const handleExportExcel = () => exportDataToExcel(getExportData(), `Produtividade_${driver?.name}_${startDate}_a_${endDate}`);
  const handleExportCSV = () => exportDataToCSV(getExportData(), `Produtividade_${driver?.name}_${startDate}_a_${endDate}`);

  const handleExportWord = async () => {
    if (!driver) return;
    const data = getExportData();
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: "MÉTRICAS DE PRODUTIVIDADE", bold: true, size: 32, color: "71717a" })],
            alignment: AlignmentType.CENTER, spacing: { after: 400 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `Entregador: ${driver.name}`, bold: true, size: 24 })],
            spacing: { after: 100 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["DATA", "HORA", "ZONA", "FREQ. ZONA", "VOL"].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "71717a" })], alignment: AlignmentType.CENTER })]
                  })
                ),
              }),
              ...data.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(item.Data)] }),
                  new TableCell({ children: [new Paragraph(item.Hora)] }),
                  new TableCell({ children: [new Paragraph(item.Zona)] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun(item["Frequência na Zona"].toString())], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun(item.Volume.toString())], alignment: AlignmentType.CENTER })] }),
                ]
              }))
            ]
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    downloadFile(blob, `Produtividade_${driver.name}.docx`);
  };

  const barChartData = useMemo(() => {
    const dailyVolume: Record<string, number> = {};
    filteredLogs.forEach(log => { dailyVolume[log.date] = (dailyVolume[log.date] || 0) + log.ordersCount; });
    const sortedDates = Object.keys(dailyVolume).sort();
    return {
      labels: sortedDates.map(d => formatDateBR(d)),
      datasets: [{ label: 'Volumes Entregues', data: sortedDates.map(d => dailyVolume[d]), backgroundColor: '#06b6d4', borderRadius: 8 }]
    };
  }, [filteredLogs]);

  const doughnutChartData = useMemo(() => {
    const zoneCount: Record<string, number> = {};
    filteredLogs.forEach(log => { zoneCount[log.zone || 'N/A'] = (zoneCount[log.zone || 'N/A'] || 0) + 1; });
    return {
      labels: Object.keys(zoneCount),
      datasets: [{ data: Object.values(zoneCount), backgroundColor: ['#06b6d4', '#10b981', '#fbbf24', '#a855f7', '#f43f5e'], borderWidth: 0 }]
    };
  }, [filteredLogs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
      <div className="flex flex-col gap-4">
        <input placeholder="BUSCAR ENTREGADOR..." className={`p-4 rounded-xl border font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto custom-scrollbar">
          {drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)} className={`px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-tight ${selectedId === d.id ? 'bg-cyan-600 text-white' : (isDarkMode ? 'hover:bg-white/5 opacity-50' : 'hover:bg-slate-100 opacity-60')}`}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {selectedId && driver ? (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-cyan-500">{driver.name}</h3>
                <div className="flex items-center gap-3 mt-4">
                  <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-emerald-500 flex items-center gap-2">📊 EXCEL</button>
                  <button onClick={handleExportCSV} className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-emerald-600 flex items-center gap-2">📄 CSV</button>
                  <button onClick={handleExportWord} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-500 flex items-center gap-2">📝 WORD</button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="date" className={`px-4 py-2 rounded-xl text-[10px] font-black mono border ${isDarkMode ? 'bg-slate-900 border-white/5 text-white' : 'bg-slate-100 border-slate-200'}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="opacity-20">→</span>
                <input type="date" className={`px-4 py-2 rounded-xl text-[10px] font-black mono border ${isDarkMode ? 'bg-slate-900 border-white/5 text-white' : 'bg-slate-100 border-slate-200'}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Saídas" value={loading ? '...' : stats.exits} icon="🚚" color="cyan-500" isDarkMode={isDarkMode} />
              <StatCard title="Total Volumes" value={loading ? '...' : stats.volume} icon="📦" color="emerald-500" isDarkMode={isDarkMode} />
              <StatCard title="Média Vol" value={loading ? '...' : stats.avg} icon="📈" color="amber-500" isDarkMode={isDarkMode} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className={`p-8 rounded-[40px] border flex flex-col min-h-[400px] ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-100'}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-8">Volumes por Dia</h4>
                <div className="flex-1">
                  <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>

              <div className={`p-8 rounded-[40px] border flex flex-col min-h-[400px] ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-white border-slate-100'}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-8">Zonas Atendidas</h4>
                <div className="flex-1 flex items-center justify-center">
                  <div className="max-w-[250px] w-full">
                    <Doughnut data={doughnutChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[500px] flex items-center justify-center opacity-10">
            <span className="font-black uppercase tracking-[0.5em] text-center text-xl">Selecione para analisar</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string; isDarkMode: boolean }> = ({ title, value, icon, color, isDarkMode }) => (
  <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{title}</span>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className={`text-4xl font-black tracking-tighter ${color === 'cyan-500' ? 'text-cyan-500' : color === 'emerald-500' ? 'text-emerald-500' : 'text-amber-500'}`}>
      {value}
    </div>
  </div>
);

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const RegisterDriverForm: React.FC<{ isDarkMode: boolean; onSave: (d: Driver) => void }> = ({ isDarkMode, onSave }) => {
  const [formData, setFormData] = useState({ name: '', fleetNumber: '', registration: '', company: '' });
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, id: '' }); }}>
      <input placeholder="NOME DO ENTREGADOR" required className={`p-5 rounded-2xl border font-black uppercase ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} />
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="FROTA" required className={`p-5 rounded-2xl border font-black mono ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.fleetNumber} onChange={e => setFormData({ ...formData, fleetNumber: e.target.value })} />
        <input placeholder="MATRÍCULA" required className={`p-5 rounded-2xl border font-black mono ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.registration} onChange={e => setFormData({ ...formData, registration: e.target.value })} />
      </div>
      <input placeholder="EMPRESA" required className={`p-5 rounded-2xl border font-black uppercase ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value.toUpperCase() })} />
      <button className="bg-cyan-600 text-white p-6 rounded-[24px] font-black uppercase tracking-widest mt-4 shadow-xl transition-all hover:bg-cyan-500 active:scale-95">Finalizar Cadastro</button>
    </form>
  );
};

const DeleteDriverView: React.FC<{ isDarkMode: boolean; drivers: Driver[]; onUpdate?: (d: Driver) => void; onDelete?: (id: string) => void }> = ({ isDarkMode, drivers, onUpdate, onDelete }) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Driver | null>(null);

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const handleStartEdit = (d: Driver) => {
    setEditingId(d.id);
    setEditForm({ ...d });
  };

  const handleSaveEdit = () => {
    if (onUpdate && editForm) {
      onUpdate(editForm);
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input placeholder="BUSCAR ENTREGADOR..." className={`flex-1 p-5 rounded-2xl border font-black uppercase tracking-tighter ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-sm'}`} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(d => (
          <div key={d.id} className={`p-6 rounded-[28px] border transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
            {editingId === d.id && editForm ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <input className={`p-3 rounded-xl border font-black uppercase text-xs ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'}`} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value.toUpperCase() })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={`p-3 rounded-xl border font-black mono text-[10px] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'}`} value={editForm.fleetNumber} onChange={e => setEditForm({ ...editForm, fleetNumber: e.target.value })} />
                  <input className={`p-3 rounded-xl border font-black mono text-[10px] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'}`} value={editForm.registration} onChange={e => setEditForm({ ...editForm, registration: e.target.value })} />
                </div>
                <input className={`p-3 rounded-xl border font-black uppercase text-xs ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'}`} value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value.toUpperCase() })} />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="flex-1 bg-cyan-700 text-white p-3 rounded-xl font-black text-[10px] uppercase">Salvar Alterações</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-500 text-white p-3 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex flex-col truncate pr-4">
                  <span className="font-black text-base uppercase truncate tracking-tight">{d.name}</span>
                  <div className="flex gap-3 text-[10px] font-black opacity-40 uppercase mono mt-1">
                    <span>{d.company}</span>
                    <span className="opacity-20">|</span>
                    <span>F: {d.fleetNumber}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button onClick={() => handleStartEdit(d)} className="bg-cyan-500/10 text-cyan-600 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-sm">Editar Cadastro</button>
                  <button
                    onClick={() => onDelete && onDelete(d.id)}
                    className="bg-red-500/10 text-red-600 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const IncludeInQueue: React.FC<{ isDarkMode: boolean; drivers: Driver[]; onSelect: (d: Driver) => void }> = ({ isDarkMode, drivers, onSelect }) => {
  const [search, setSearch] = useState('');
  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex flex-col gap-4">
      <input placeholder="LOCALIZAR ENTREGADOR..." className={`p-5 rounded-2xl border font-black uppercase tracking-tighter ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filtered.map(d => (
          <button key={d.id} onClick={() => onSelect(d)} className={`p-6 rounded-[28px] border text-left hover:border-cyan-500 transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="font-black text-lg block leading-tight uppercase">{d.name}</span>
            <span className="block text-[10px] font-black opacity-40 uppercase mt-1 tracking-widest">{d.company} • Frota: {d.fleetNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ExitForm: React.FC<{ isDarkMode: boolean; driver: QueueEntry; period: Period; onConfirm: (log: Omit<ExitLog, 'id' | 'date' | 'exitTime'>) => void }> = ({ isDarkMode, driver, period, onConfirm }) => {
  const [zone, setZone] = useState('');
  const [dtNumber, setDtNumber] = useState('');
  const [ordersCount, setOrdersCount] = useState<number>(1);
  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); onConfirm({ driverId: driver.id, name: driver.name, fleetNumber: driver.fleetNumber, registration: driver.registration, company: driver.company, zone, dtNumber, ordersCount, period }); }}>
      <div className="p-6 rounded-[32px] bg-cyan-600 text-white shadow-xl">
        <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Protocolo de Saída</span>
        <div className="font-black text-2xl tracking-tighter mt-1 uppercase">{driver.name}</div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-widest">Destino</label>
          <select required className={`p-5 rounded-2xl border font-black outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} value={zone} onChange={e => setZone(e.target.value)}>
            <option value="">SELECIONAR ZONA...</option>
            {ZONES_LIST.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-widest">Nº DT</label>
            <input placeholder="00000" required className={`p-5 rounded-2xl border font-black mono ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} value={dtNumber} onChange={e => setDtNumber(e.target.value.toUpperCase())} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-widest">Volume</label>
            <input type="number" required className={`p-5 rounded-2xl border font-black mono text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} value={ordersCount} onChange={e => setOrdersCount(parseInt(e.target.value) || 1)} />
          </div>
        </div>
      </div>
      <button className="bg-cyan-600 text-white p-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-lg transition-all hover:bg-cyan-500">Confirmar Saída</button>
    </form>
  );
};

const ReportView: React.FC<{ logs: ExitLog[] }> = ({ logs }) => (
  <div className="flex flex-col gap-4">
    <div className="p-10 bg-white text-slate-900 font-mono border-4 border-slate-900">
      <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-slate-900 pb-2">DAILY OPERATIONAL LOG</h2>
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="py-2">HORA</th>
            <th className="py-2">ENTREGADOR</th>
            <th className="py-2">ZONA</th>
            <th className="py-2">DT</th>
            <th className="py-2 text-right">VOL</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-b border-slate-200">
              <td className="py-2">{new Date(l.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="py-2 font-bold uppercase">{l.name}</td>
              <td className="py-2 uppercase">{l.zone}</td>
              <td className="py-2">{l.dtNumber}</td>
              <td className="py-2 text-right font-bold">{l.ordersCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <button onClick={() => window.print()} className="bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl no-print">Imprimir Relatório</button>
  </div>
);

const RemoveByPositionForm: React.FC<{ isDarkMode: boolean; onConfirm: (pos: number, p: Period) => void }> = ({ isDarkMode, onConfirm }) => {
  const [pos, setPos] = useState('');
  const [period, setPeriod] = useState<Period>(Period.MORNING);
  return (
    <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); onConfirm(parseInt(pos), period); }}>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setPeriod(Period.MORNING)} className={`p-5 rounded-2xl font-black uppercase tracking-widest transition-all ${period === Period.MORNING ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-500/10 opacity-40'}`}>Manhã</button>
        <button type="button" onClick={() => setPeriod(Period.AFTERNOON)} className={`p-5 rounded-2xl font-black uppercase tracking-widest transition-all ${period === Period.AFTERNOON ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-500/10 opacity-40'}`}>Tarde</button>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Posição na Fila</label>
        <input type="number" placeholder="00" required className={`p-8 text-6xl text-center font-black rounded-[32px] border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 shadow-inner'}`} value={pos} onChange={e => setPos(e.target.value)} />
      </div>
      <button className="bg-red-600 text-white p-6 rounded-[24px] font-black uppercase tracking-widest shadow-xl transition-all hover:bg-red-500">Remover da Fila</button>
    </form>
  );
};

/* --- MISSING INTERFACE --- */
interface FrequencyEntry {
  name: string;
  status: 'FILA' | 'SAIDA';
  time: number;
}

const QueueFrequencyView: React.FC<{ isDarkMode: boolean; morningQueue: QueueEntry[]; afternoonQueue: QueueEntry[]; logs: ExitLog[] }> = ({ isDarkMode, morningQueue, afternoonQueue, logs }) => {
  const today = new Date().toISOString().split('T')[0];
  const targetCompanies = ["INNOVATIVE", "NAVEGAM"];

  const frequencyData = useMemo(() => {
    const data = {
      [Period.MORNING]: { "INNOVATIVE": [] as FrequencyEntry[], "NAVEGAM": [] as FrequencyEntry[] },
      [Period.AFTERNOON]: { "INNOVATIVE": [] as FrequencyEntry[], "NAVEGAM": [] as FrequencyEntry[] }
    };

    const processSet = (p: Period, qItems: QueueEntry[], logsToday: ExitLog[]) => {
      const uniqueDrivers = new Map<string, { company: string; status: 'FILA' | 'SAIDA', time: number }>();

      logsToday.filter(l => l.period === p).forEach(l => {
        const comp = (l.company || '').toUpperCase().trim();
        if (targetCompanies.includes(comp)) {
          uniqueDrivers.set(l.name, { company: comp, status: 'SAIDA', time: l.exitTime });
        }
      });

      qItems.forEach(q => {
        const comp = (q.company || '').toUpperCase().trim();
        if (targetCompanies.includes(comp) && !uniqueDrivers.has(q.name)) {
          uniqueDrivers.set(q.name, { company: comp, status: 'FILA', time: q.arrivalTime });
        }
      });

      uniqueDrivers.forEach((val, name) => {
        if (data[p][val.company]) {
          data[p][val.company].push({ name, status: val.status, time: val.time });
        }
      });

      targetCompanies.forEach(c => data[p][c].sort((a, b) => a.time - b.time));
    };

    const todayLogs = logs.filter(l => l.date === today);
    processSet(Period.MORNING, morningQueue, todayLogs);
    processSet(Period.AFTERNOON, afternoonQueue, todayLogs);
    return data;
  }, [morningQueue, afternoonQueue, logs, today]);

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-700">
      {[Period.MORNING, Period.AFTERNOON].map(period => (
        <div key={period} className={`p-8 rounded-[40px] border-2 transition-all ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="mb-8 flex items-center gap-4 px-2">
            <h4 className={`text-4xl font-black uppercase tracking-tighter mono ${period === Period.MORNING ? 'text-amber-500' : 'text-purple-500'}`}>{period}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {targetCompanies.map(company => (
              <div key={company} className="flex flex-col gap-4">
                <h5 className="text-xl font-black uppercase tracking-widest text-slate-500 mono border-b-2 border-slate-500/20 pb-3">{company}</h5>
                <div className="flex flex-col gap-2 min-h-[50px]">
                  {frequencyData[period][company].map((entry) => (
                    <div key={entry.name} className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <span className="font-black uppercase text-sm truncate">{entry.name}</span>
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${entry.status === 'FILA' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-500/10 text-slate-500 opacity-50'}`}>
                        {entry.status === 'FILA' ? 'EM FILA' : 'SAIU'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* --- MISSING COMPONENT --- */
/* --- MISSING COMPONENT --- */
const RegisterTenantForm: React.FC<{ isDarkMode: boolean; onSave: () => void }> = ({ isDarkMode, onSave }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tenantId = crypto.randomUUID();
    const { error } = await supabase.from('operator_access').insert([{
      pin,
      label: name,
      tenant_id: tenantId
    }]);

    if (!error) {
      alert(`Inquilino "${name}" criado com sucesso! Use o PIN ${pin} para acessar.`);
      onSave();
    } else {
      alert('Erro ao criar inquilino: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">NOME DO LUGAR / UNIDADE</label>
        <input placeholder="EX: UNIDADE SUL" required className={`p-5 rounded-2xl border font-black uppercase ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={name} onChange={e => setName(e.target.value.toUpperCase())} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">CÓDIGO DE ACESSO (PIN)</label>
        <input placeholder="EX: 1234" required type="password" inputMode="numeric" className={`p-5 rounded-2xl border font-black mono text-center text-3xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={pin} onChange={e => setPin(e.target.value)} />
      </div>
      <button disabled={loading} className="bg-cyan-700 text-white p-6 rounded-[24px] font-black uppercase tracking-widest mt-4 shadow-xl transition-all hover:bg-cyan-600 active:scale-95 disabled:opacity-50">
        {loading ? 'CRIANDO...' : 'CRIAR NOVO WORKSPACE'}
      </button>
    </form>
  );
};

const RegisterOperatorForm: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const email = username.includes('@') ? username : `${username.toLowerCase().trim()}@terminal.com`;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else {
      setMsg({ text: 'Usuário cadastrado com sucesso! Verifique se a confirmação por e-mail é necessária.', type: 'success' });
      setUsername('');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-6">
      <div className="p-6 rounded-[32px] bg-cyan-700 text-white shadow-xl mb-4">
        <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Acesso ao Terminal</span>
        <div className="font-black text-2xl tracking-tighter mt-1 uppercase">NOVO OPERADOR</div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-widest">NOME / USUÁRIO</label>
          <input
            placeholder="Ex: felipe"
            required
            className={`p-5 rounded-2xl border font-black outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase opacity-40 ml-2 tracking-widest">SENHA ACESSO</label>
          <input
            type="password"
            placeholder="••••••••"
            required
            className={`p-5 rounded-2xl border font-black outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl font-black text-[10px] uppercase text-center ${msg.type === 'success' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      <button
        disabled={loading}
        className="bg-cyan-700 text-white p-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-lg transition-all hover:bg-cyan-600 disabled:opacity-50"
      >
        {loading ? 'CADASTRANDO...' : 'CRIAR ACESSO'}
      </button>

      <p className="text-[9px] text-center opacity-40 font-bold uppercase mt-4">
        ⚠️ Atenção: O novo usuário poderá acessar o sistema imediatamente se o auto-confirm estiver ativo no Supabase.
      </p>
    </form>
  );
};

const SecurityChallengeView: React.FC<{
  isDarkMode: boolean;
  challenge: { code: string; expiresAt: number };
  onSuccess: () => void;
  onRetry: () => void;
}> = ({ isDarkMode, challenge, onSuccess, onRetry }) => {
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((challenge.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [challenge.expiresAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      alert('Código expirado.');
      onRetry();
      return;
    }
    if (input === challenge.code) {
      onSuccess();
    } else {
      alert('Código incorreto.');
      setInput('');
    }
  };

  return (
    <div className="flex flex-col gap-8 items-center text-center">
      <div className={`p-10 rounded-[40px] border-4 border-dashed ${isDarkMode ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-black uppercase mb-2">Operação Crítica</h3>
        <p className="text-xs opacity-60 font-bold uppercase tracking-widest max-w-xs mx-auto">
          VOCÊ ESTÁ PRESTES A APAGAR TODOS OS DADOS OPERACIONAIS DO SISTEMA. ESTA AÇÃO É IRREVERSÍVEL.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em]">INSIRA O CÓDIGO DE SEGURANÇA</label>
          <div className="text-4xl font-black tracking-[0.5em] text-slate-500 my-4 select-none">
            {challenge.code}
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 animate-pulse mb-4">
            EXPIRA EM {timeLeft} SEGUNDOS
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              autoFocus
              type="text"
              maxLength={6}
              placeholder="000000"
              className={`p-6 text-4xl text-center font-black rounded-3xl border outline-none ${isDarkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-100 border-slate-200 shadow-inner'}`}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button
              disabled={timeLeft <= 0}
              className="bg-red-600 text-white p-6 rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-red-500 disabled:opacity-50"
            >
              CONFIRMAR DESTRUIÇÃO DE DADOS
            </button>
            <button type="button" onClick={onRetry} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">
              GERAR NOVO CÓDIGO
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
