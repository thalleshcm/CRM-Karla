-- Aurum CRM — schema único (Postgres / Supabase self-hosted).
-- Rodar no SQL Editor do Studio (não passa pelo PostgREST). Idempotente:
-- pode ser executado tanto num banco novo (cria tudo do zero) quanto no
-- banco atual do projeto (os `if not exists`/`add column if not exists`
-- só preenchem o que ainda estiver faltando, sem tocar no que já existe).
-- RLS habilitado em todas as tabelas, sem policies para anon/authenticated
-- — só a policy service_role_full_access libera o Express (que usa a
-- service role key).

create table if not exists public.profiles (
  id text primary key,
  name text not null,
  email text not null,
  role text not null,
  role_label text not null,
  creci text,
  phone text,
  initials text not null,
  avatar_color text,
  active boolean not null default true,
  auth_user_id uuid references auth.users(id) on delete set null,
  assigned_lead_count integer not null default 0,
  last_login_at timestamptz,
  manager_id text
);
-- Compatibilidade com bancos criados antes da migração para id text
-- (os ids do app não são UUIDs, ex: "user-admin-1").
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id type text;
alter table public.profiles add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists assigned_lead_count integer not null default 0;
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists manager_id text;

create table if not exists public.funnels (
  id text primary key,
  name text not null,
  description text,
  is_default boolean not null default false
);

create table if not exists public.role_permissions (
  role text primary key,
  config jsonb not null default '{}'::jsonb
);

create table if not exists public.settings (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.leads (
  id text primary key,
  name text not null,
  phone text,
  email text,
  funnel_id text,
  stage_id text,
  broker_id text,
  status text,
  temperature text,
  estimated_value numeric,
  created_at timestamptz not null default now(),
  archived boolean not null default false,
  client_portal_token text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists leads_funnel_id_idx on public.leads(funnel_id);
create index if not exists leads_broker_id_idx on public.leads(broker_id);
create index if not exists leads_stage_id_idx on public.leads(stage_id);
create index if not exists leads_client_portal_token_idx on public.leads(client_portal_token);

create table if not exists public.activities (
  id text primary key,
  lead_id text references public.leads(id) on delete cascade,
  broker_id text,
  type text not null,
  date_time timestamptz,
  reminder_time timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);
create index if not exists activities_lead_id_idx on public.activities(lead_id);

create table if not exists public.contracts (
  id text primary key,
  lead_id text references public.leads(id) on delete set null,
  broker_id text,
  client_name text not null,
  enterprise_name text,
  value numeric,
  status text,
  closed_at timestamptz,
  commission_percent numeric,
  broker_commission_percent numeric,
  total_commission_value numeric,
  data jsonb not null default '{}'::jsonb
);
create index if not exists contracts_lead_id_idx on public.contracts(lead_id);

create table if not exists public.commissions (
  id text primary key,
  contract_id text references public.contracts(id) on delete cascade,
  broker_id text,
  installment_number integer,
  total_installments integer,
  due_date timestamptz,
  payment_date timestamptz,
  amount numeric,
  status text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists commissions_contract_id_idx on public.commissions(contract_id);

create table if not exists public.notifications (
  id text primary key,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.outgoing_webhooks (
  id text primary key,
  name text not null,
  url text not null,
  events text[] not null default '{}',
  secret text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_triggered_at timestamptz,
  last_status text,
  last_error text
);

create table if not exists public.mcp_tokens (
  id text primary key,
  name text not null,
  token_preview text not null,
  token_hash text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false,
  expires_at timestamptz
);
alter table public.mcp_tokens add column if not exists expires_at timestamptz;

create table if not exists public.invites (
  id text primary key,
  name text not null,
  email text not null,
  role text not null,
  role_label text not null,
  creci text,
  phone text,
  token text not null unique,
  invited_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists invites_token_idx on public.invites(token);

create table if not exists public.audit_log (
  id text primary key,
  actor_id text not null,
  actor_name text not null,
  action text not null,
  target_label text not null,
  details text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);

-- Pessoa independente de uma negociação específica — permite reconhecer o
-- mesmo comprador em múltiplos Leads (recompra) e evita duplicidade no
-- cadastro manual/importação (dedup por telefone).
create table if not exists public.clients (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_phone_idx on public.clients(phone);

-- RLS: deny-all por padrão, só a service_role (usada pelo Express) acessa.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','funnels','role_permissions','settings','leads',
    'activities','contracts','commissions','notifications',
    'outgoing_webhooks','mcp_tokens','invites','audit_log','clients'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists service_role_full_access on public.%I', t);
    execute format(
      'create policy service_role_full_access on public.%I for all to service_role using (true) with check (true)',
      t
    );
  end loop;
end $$;
