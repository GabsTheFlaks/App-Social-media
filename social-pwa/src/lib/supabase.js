import { createClient } from '@supabase/supabase-js';

// Essas chaves devem vir de variáveis de ambiente.
// Crie um arquivo .env na raiz do projeto com as chaves:
// VITE_SUPABASE_URL=sua_url_aqui
// VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-url-do-supabase.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-anon-key-publica';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
