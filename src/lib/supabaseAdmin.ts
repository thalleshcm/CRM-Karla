import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY são obrigatórios no .env');
}

// Server-only client — usa a service role key, que ignora RLS. Nunca deve
// ser reutilizado no frontend (ver .env: comentário sobre SUPABASE_ANON_KEY).
//
// IMPORTANTE: nunca chamar métodos que mutam sessão (auth.signInWithPassword,
// auth.signUp, etc) neste client — supabase-js troca automaticamente o
// header de autorização das chamadas .from() para o JWT da sessão do
// usuário logado, derrubando o acesso via service role em todas as
// consultas seguintes feitas com este mesmo client (foi exatamente essa a
// causa de erros intermitentes de RLS na migração). Métodos .auth.admin.*
// são seguros aqui, pois não tocam o estado de sessão do client.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Client separado, com a anon key, usado exclusivamente para autenticação
// de usuário final (signInWithPassword) — mantém a sessão do usuário
// isolada do client de dados acima.
export const supabaseAuth = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
