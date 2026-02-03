
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { Period, Driver, QueueEntry, ExitLog } from './types';
import Sidebar from './components/Sidebar';
import QueueColumn from './components/QueueColumn';
import ModalManager from './components/ModalManager';
import RecentExits from './components/RecentExits';
import AuthScreen from './components/AuthScreen';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [morningQueue, setMorningQueue] = useState<QueueEntry[]>([]);
  const [afternoonQueue, setAfternoonQueue] = useState<QueueEntry[]>([]);
  const [exitLogs, setExitLogs] = useState<ExitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MORNING);
  const [editingDriver, setEditingDriver] = useState<QueueEntry | null>(null);
  const [securityChallenge, setSecurityChallenge] = useState<{ code: string; expiresAt: number } | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved === 'true' || saved === null;
  });

  const mapDriver = (d: any): Driver => ({
    id: d.id,
    name: d.name,
    fleetNumber: d.fleet_number || '',
    registration: d.registration || '',
    company: d.company || ''
  });

  const fetchQueues = async () => {
    const { data } = await supabase.from('queues').select(`*, drivers(*)`).order('arrival_time', { ascending: true });
    if (data) {
      const formattedQueue: QueueEntry[] = data
        .filter((q: any) => q.drivers)
        .map((q: any) => ({
          ...mapDriver(q.drivers),
          queueId: q.id,
          arrivalTime: q.arrival_time,
          period: q.period as Period
        }));
      
      setMorningQueue(formattedQueue.filter(q => q.period === Period.MORNING));
      setAfternoonQueue(formattedQueue.filter(q => q.period === Period.AFTERNOON));
    }
  };

  const fetchDriversList = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data.map(mapDriver));
  };

  const fetchRecentLogs = async () => {
    const { data } = await supabase
      .from('exit_logs')
      .select('*')
      .order('exit_time', { ascending: false })
      .limit(10);

    if (data) {
      const formattedLogs = data.map((l: any) => ({
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
      }));
      setExitLogs(formattedLogs);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchQueues();
      setLoading(false);

      Promise.all([
        fetchDriversList(),
        fetchRecentLogs()
      ]);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    fetchData();
    const channel = supabase.channel('realtime-logistics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => fetchQueues())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchDriversList())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exit_logs' }, () => fetchRecentLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, session]);

  useEffect(() => {
    localStorage.setItem('dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  const openModal = useCallback((type: string) => {
    startTransition(() => {
      setModalType(type);
    });
    setIsSidebarOpen(false);
  }, []);

  const addDriverToQueue = useCallback(async (driver: Driver, period: Period) => {
    await supabase.from('queues').insert([{
      driver_id: driver.id,
      period: period,
      arrival_time: Date.now()
    }]);
    setModalType(null);
  }, []);

  const registerNewDriver = useCallback(async (driver: Driver) => {
    await supabase.from('drivers').insert([{
      name: driver.name,
      fleet_number: driver.fleetNumber,
      registration: driver.registration,
      company: driver.company
    }]);
    setModalType(null);
  }, []);

  const updateDriverInDatabase = useCallback(async (driver: Driver) => {
    await supabase.from('drivers').update({
      name: driver.name,
      fleet_number: driver.fleetNumber,
      registration: driver.registration,
      company: driver.company
    }).eq('id', driver.id);
    fetchDriversList();
  }, []);

  const removeDriverFromDatabase = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (confirm(`ATENÇÃO: Deseja apagar permanentemente "${driver?.name}"?`)) {
      setLoading(true);
      await supabase.from('queues').delete().eq('driver_id', driverId);
      await supabase.from('exit_logs').delete().eq('driver_id', driverId);
      await supabase.from('drivers').delete().eq('id', driverId);
      fetchData();
    }
  }, [drivers, fetchData]);

  const clearAllOperationalData = useCallback(() => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSecurityChallenge({ code: newCode, expiresAt: Date.now() + 30000 });
    setModalType('security-challenge');
  }, []);

  const executeDataPurge = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('queues').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('exit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
      fetchData();
      alert('Sistema reiniciado.');
      setModalType(null);
    } catch (err) {
      alert('Erro na limpeza.');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const removeFromQueue = useCallback(async (targetQueueId: string) => {
    await supabase.from('queues').delete().eq('id', targetQueueId);
  }, []);

  const handleRemoveByPosition = useCallback(async (pos: number, period: Period) => {
    const targetList = period === Period.MORNING ? morningQueue : afternoonQueue;
    const target = targetList[pos - 1];
    if (target) await removeFromQueue(target.queueId);
    setModalType(null);
  }, [morningQueue, afternoonQueue, removeFromQueue]);

  const handleExit = useCallback(async (log: Omit<ExitLog, 'id' | 'date' | 'exitTime'>) => {
    const newLog = {
      driver_id: log.driverId,
      name: log.name,
      fleet_number: log.fleetNumber,
      registration: log.registration,
      company: log.company,
      zone: log.zone,
      dt_number: log.dtNumber,
      orders_count: log.ordersCount,
      period: log.period,
      exit_time: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase.from('exit_logs').insert([newLog]);
    if (!error) {
      const targetQueue = log.period === Period.MORNING ? morningQueue : afternoonQueue;
      const queueItem = targetQueue.find(q => q.id === log.driverId);
      if (queueItem) await removeFromQueue(queueItem.queueId);
      setModalType(null);
      setEditingDriver(null);
    }
  }, [morningQueue, afternoonQueue, removeFromQueue]);

  const reorderQueue = useCallback(async (newList: QueueEntry[], period: Period) => {
    const baseTime = Date.now();
    const updates = newList.map((item, index) => 
      supabase.from('queues').update({ arrival_time: baseTime + index }).eq('id', item.queueId)
    );
    await Promise.all(updates);
    fetchQueues();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!session) {
    return <AuthScreen isDarkMode={isDarkMode} onSuccess={() => {}} />;
  }

  return (
    <div className={`min-h-screen flex font-sans transition-all duration-700 relative overflow-x-hidden ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="map-overlay" />
      <div className="grid-pattern" />
      <div className="radar-scan no-print" />

      <Sidebar 
        isOpen={isSidebarOpen}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onClose={() => setIsSidebarOpen(false)}
        onOpenModal={openModal} 
        lastExit={exitLogs[0]}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col p-4 lg:p-8 gap-6 overflow-y-auto relative z-10">
        <header className="flex items-center justify-between no-print mb-4">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className={`p-3.5 rounded-2xl transition-all border-2 ${isDarkMode ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]' : 'bg-white border-slate-200 text-slate-600 shadow-xl'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-600 rounded-2xl rotate-12 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/40 shrink-0">OC</div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter mono">ORDEM DE <span className="text-cyan-500">CHEGADA</span></h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mono">{loading ? 'SINCRONIZANDO...' : 'OPERACIONAL'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mono mr-2">
              {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </header>

        <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_320px_1fr] gap-8 items-start max-w-[1700px] mx-auto w-full transition-opacity duration-500 ${loading ? 'opacity-30' : 'opacity-100'}`}>
          <QueueColumn period={Period.MORNING} queue={morningQueue} isDarkMode={isDarkMode} onAddClick={() => { setSelectedPeriod(Period.MORNING); startTransition(() => setModalType('include')); }} onExitClick={(d) => { setSelectedPeriod(Period.MORNING); setEditingDriver(d); startTransition(() => setModalType('exit')); }} onRemove={removeFromQueue} onReorder={(l) => reorderQueue(l, Period.MORNING)} onClear={()=>{}} onUpdate={()=>{}} />
          <RecentExits logs={exitLogs} isDarkMode={isDarkMode} />
          <QueueColumn period={Period.AFTERNOON} queue={afternoonQueue} isDarkMode={isDarkMode} onAddClick={() => { setSelectedPeriod(Period.AFTERNOON); startTransition(() => setModalType('include')); }} onExitClick={(d) => { setSelectedPeriod(Period.AFTERNOON); setEditingDriver(d); startTransition(() => setModalType('exit')); }} onRemove={removeFromQueue} onReorder={(l) => reorderQueue(l, Period.AFTERNOON)} onClear={()=>{}} onUpdate={()=>{}} />
        </div>
      </main>

      <ModalManager 
        type={modalType} 
        period={selectedPeriod} 
        drivers={drivers} 
        exitLogs={exitLogs} 
        isDarkMode={isDarkMode} 
        editingDriver={editingDriver} 
        morningQueue={morningQueue} 
        afternoonQueue={afternoonQueue} 
        securityChallenge={securityChallenge}
        onClose={() => { setModalType(null); setEditingDriver(null); }} 
        onRegisterDriver={registerNewDriver} 
        onUpdateDriver={updateDriverInDatabase} 
        onDeleteDriverFromDB={removeDriverFromDatabase} 
        onAddToQueue={addDriverToQueue} 
        onConfirmExit={handleExit} 
        onReorder={reorderQueue} 
        onRemoveByPosition={handleRemoveByPosition} 
        onClearAllOperationalData={clearAllOperationalData}
        onConfirmSecurityPurge={executeDataPurge}
      />
    </div>
  );
};

export default App;
