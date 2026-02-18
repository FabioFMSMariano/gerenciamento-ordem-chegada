
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  isDarkMode: boolean;
  onSuccess: (tenantId: string, label?: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ isDarkMode, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError(null);

    try {
      // Verifica o PIN na tabela operator_access
      const { data, error: queryError } = await supabase
        .from('operator_access')
        .select('*')
        .eq('pin', pin)
        .single();

      if (queryError || !data) {
        setError('Acesso negado. Código incorreto.');
      } else {
        // Se o PIN estiver correto, salvamos no localStorage para persistência
        const tenantId = data.tenant_id || data.id; // Fallback para ID se tenant_id for nulo
        localStorage.setItem('terminal_guest_session', JSON.stringify({
          authenticated: true,
          label: data.label || 'Operador',
          tenantId: tenantId,
          loginTime: Date.now()
        }));
        onSuccess(tenantId, data.label);
      }
    } catch (err) {
      setError('Erro de conexão com o terminal.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-10 rounded-[48px] border-2 backdrop-blur-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-all duration-500 animate-in zoom-in-95 fade-in ${isDarkMode
        ? 'bg-slate-950/90 border-cyan-500/20 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-900'
        }`}>
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-cyan-600 rounded-3xl rotate-12 flex items-center justify-center text-white font-black text-4xl shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-4 transition-transform hover:rotate-0 duration-500">
            <span className="-rotate-12 tracking-tighter">OC</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <label className="text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-40">CÓDIGO DE ACESSO</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              placeholder="••••"
              autoFocus
              className={`w-full px-8 py-8 rounded-[32px] border-4 outline-none font-black mono text-4xl text-center tracking-[0.5em] transition-all shadow-inner ${isDarkMode
                ? 'bg-slate-900 border-white/5 focus:border-cyan-500/50 text-white'
                : 'bg-slate-50 border-slate-200 focus:border-cyan-500 text-slate-900'
                }`}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>

          {error && (
            <div className="px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-bounce">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3 animate-pulse">VERIFICANDO...</span>
              ) : (
                'INICIAR OPERAÇÃO'
              )}
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className={`px-4 ${isDarkMode ? 'bg-slate-950/90 text-slate-500' : 'bg-white text-slate-400'}`}>OU</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            className={`flex items-center justify-center gap-4 py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] transition-all border-2 ${isDarkMode
              ? 'bg-slate-900 border-white/5 hover:bg-white/5 text-slate-100'
              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-900 shadow-sm'
              }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Administrar (GitHub)
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">TERMINAL LOGÍSTICO v2.5</p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
