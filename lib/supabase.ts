
import { createClient } from '@supabase/supabase-js';

// Utiliza variáveis de ambiente do Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("❌ Credenciais do Supabase não configuradas! Verifique o arquivo .env.local");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
