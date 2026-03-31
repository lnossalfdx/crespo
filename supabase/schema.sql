create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'manager', 'agent');
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_stage') then
    create type public.lead_stage as enum (
      'novo',
      'qualificando',
      'proposta',
      'negociacao',
      'ganho',
      'perdido'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'client_status') then
    create type public.client_status as enum ('ativo', 'inativo', 'prospecto');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('em_andamento', 'concluido', 'pausado');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('entrada', 'saida');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type public.event_type as enum ('reuniao', 'followup', 'demo', 'ligacao');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  phone text not null default '',
  role public.user_role not null default 'agent',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  notification_settings jsonb not null default jsonb_build_object(
    'novaLead', true,
    'negocioFechado', true,
    'pagamentoRecebido', true,
    'tarefaVencendo', true,
    'followupPendente', false,
    'relatorioSemanal', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id text primary key default 'default',
  name text not null default '',
  cnpj text not null default '',
  address text not null default '',
  segment text not null default '',
  website text not null default '',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_settings (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '',
  connected boolean not null default false,
  status text not null default 'Desconectado',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  phone text not null default '',
  email text not null default '',
  value numeric(12,2) not null default 0,
  setup numeric(12,2),
  mensalidade numeric(12,2),
  stage public.lead_stage not null default 'novo',
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  notes text not null default '',
  tags text[] not null default '{}',
  assigned_to uuid references public.profiles(id) on delete set null,
  shared_with uuid[] not null default '{}',
  recorrencia_percentual numeric(5,2),
  activity_timeline jsonb not null default '[]'::jsonb,
  notes_history jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  phone text not null default '',
  email text not null default '',
  status public.client_status not null default 'prospecto',
  tags text[] not null default '{}',
  last_interaction timestamptz not null default now(),
  created_at timestamptz not null default now(),
  total_value numeric(12,2) not null default 0,
  deals jsonb not null default '[]'::jsonb,
  notes text not null default '',
  activity_timeline jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  notes_history jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  status public.project_status not null default 'em_andamento',
  progress integer not null default 0 check (progress between 0 and 100),
  deadline date,
  start_date date,
  team jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  description text not null default '',
  mensalidade numeric(12,2),
  briefing_questions jsonb not null default '[]'::jsonb,
  credentials jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  category text not null,
  type public.transaction_type not null,
  value numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.event_type not null,
  date date not null,
  time time not null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  notes text not null default '',
  duration integer not null default 30,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_invites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role public.user_role not null default 'agent',
  status text not null default 'pending',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_leads_stage on public.leads(stage);
create index if not exists idx_leads_assigned_to on public.leads(assigned_to);
create index if not exists idx_leads_last_activity on public.leads(last_activity desc);
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_transactions_date on public.transactions(date desc);
create index if not exists idx_events_date on public.events(date, time);

create or replace function public.current_role()
returns public.user_role
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'agent'::public.user_role
  );
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('admin', 'manager');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update set email = excluded.email;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at before update on public.user_preferences
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_company_settings_updated_at on public.company_settings;
create trigger trg_company_settings_updated_at before update on public.company_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at before update on public.integration_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at before update on public.events
  for each row execute procedure public.set_updated_at();

insert into public.company_settings (id, name, website)
values ('default', 'Responsyva', 'https://crm.responsyva-ai.com.br')
on conflict (id) do nothing;

insert into public.integration_settings (id, name, description, icon, connected, status)
values
  ('whatsapp', 'WhatsApp (UazAPI)', 'Envie e receba mensagens WhatsApp diretamente no CRM', '💬', true, 'Conectado'),
  ('n8n', 'n8n Automações', 'Automatize workflows e integrações com outros sistemas', '⚡', true, 'Conectado'),
  ('openai', 'OpenAI / GPT', 'Respostas automáticas inteligentes e análise de conversas', '🤖', false, 'Desconectado'),
  ('supabase', 'Supabase', 'Banco de dados e autenticação em tempo real', '🗄️', true, 'Conectado')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  connected = excluded.connected,
  status = excluded.status;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.company_settings enable row level security;
alter table public.integration_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.transactions enable row level security;
alter table public.events enable row level security;
alter table public.user_invites enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_admin_or_manager())
with check (auth.uid() = id or public.is_admin_or_manager());

drop policy if exists "preferences_self" on public.user_preferences;
create policy "preferences_self"
on public.user_preferences for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "company_settings_read_authenticated" on public.company_settings;
create policy "company_settings_read_authenticated"
on public.company_settings for select
to authenticated
using (true);

drop policy if exists "company_settings_admin_update" on public.company_settings;
create policy "company_settings_admin_update"
on public.company_settings for all
to authenticated
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

drop policy if exists "integration_settings_read_authenticated" on public.integration_settings;
create policy "integration_settings_read_authenticated"
on public.integration_settings for select
to authenticated
using (true);

drop policy if exists "integration_settings_admin_update" on public.integration_settings;
create policy "integration_settings_admin_update"
on public.integration_settings for all
to authenticated
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read"
on public.notifications for select
to authenticated
using (user_id = auth.uid() or public.is_admin_or_manager());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update"
on public.notifications for update
to authenticated
using (user_id = auth.uid() or public.is_admin_or_manager())
with check (user_id = auth.uid() or public.is_admin_or_manager());

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
on public.notifications for insert
to authenticated
with check (public.is_admin_or_manager() or user_id = auth.uid());

-- ── LEADS ────────────────────────────────────────────────────────────────────
-- Admin/manager: vê tudo
-- Agent: só leads atribuídas a si, criadas por si ou compartilhadas com si

drop policy if exists "leads_read_visible" on public.leads;
create policy "leads_read_visible"
on public.leads for select
to authenticated
using (
  public.is_admin_or_manager()
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or auth.uid() = any(shared_with)
);

drop policy if exists "leads_insert_authenticated" on public.leads;
create policy "leads_insert_authenticated"
on public.leads for insert
to authenticated
with check (created_by = auth.uid() or created_by is null or public.is_admin_or_manager());

drop policy if exists "leads_update_visible" on public.leads;
create policy "leads_update_visible"
on public.leads for update
to authenticated
using (
  public.is_admin_or_manager()
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or auth.uid() = any(shared_with)
)
with check (
  public.is_admin_or_manager()
  or assigned_to = auth.uid()
  or created_by = auth.uid()
  or auth.uid() = any(shared_with)
);

drop policy if exists "leads_delete_admin_manager" on public.leads;
create policy "leads_delete_admin_manager"
on public.leads for delete
to authenticated
using (public.is_admin_or_manager() or created_by = auth.uid());

-- ── CLIENTS ──────────────────────────────────────────────────────────────────
-- Admin/manager: vê tudo
-- Agent: só clientes que criou

drop policy if exists "clients_authenticated_all" on public.clients;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select"
on public.clients for select
to authenticated
using (
  public.is_admin_or_manager()
  or created_by = auth.uid()
);

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert"
on public.clients for insert
to authenticated
with check (created_by = auth.uid() or created_by is null or public.is_admin_or_manager());

drop policy if exists "clients_update" on public.clients;
create policy "clients_update"
on public.clients for update
to authenticated
using (public.is_admin_or_manager() or created_by = auth.uid())
with check (public.is_admin_or_manager() or created_by = auth.uid());

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete"
on public.clients for delete
to authenticated
using (public.is_admin_or_manager());

-- ── PROJECTS ─────────────────────────────────────────────────────────────────
-- Admin/manager: vê tudo
-- Agent: só projetos que criou ou onde aparece como membro do time (userId no JSONB)

drop policy if exists "projects_authenticated_all" on public.projects;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
on public.projects for select
to authenticated
using (
  public.is_admin_or_manager()
  or created_by = auth.uid()
  or exists (
    select 1
    from jsonb_array_elements(team) as member
    where member->>'userId' = auth.uid()::text
  )
);

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert"
on public.projects for insert
to authenticated
with check (created_by = auth.uid() or created_by is null or public.is_admin_or_manager());

drop policy if exists "projects_update" on public.projects;
create policy "projects_update"
on public.projects for update
to authenticated
using (public.is_admin_or_manager() or created_by = auth.uid())
with check (public.is_admin_or_manager() or created_by = auth.uid());

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete"
on public.projects for delete
to authenticated
using (public.is_admin_or_manager());

-- ── EVENTS ───────────────────────────────────────────────────────────────────
-- Admin/manager: vê tudo
-- Agent: só eventos que criou

drop policy if exists "events_authenticated_all" on public.events;

drop policy if exists "events_select" on public.events;
create policy "events_select"
on public.events for select
to authenticated
using (
  public.is_admin_or_manager()
  or created_by = auth.uid()
);

drop policy if exists "events_insert" on public.events;
create policy "events_insert"
on public.events for insert
to authenticated
with check (created_by = auth.uid() or created_by is null or public.is_admin_or_manager());

drop policy if exists "events_update" on public.events;
create policy "events_update"
on public.events for update
to authenticated
using (public.is_admin_or_manager() or created_by = auth.uid())
with check (public.is_admin_or_manager() or created_by = auth.uid());

drop policy if exists "events_delete" on public.events;
create policy "events_delete"
on public.events for delete
to authenticated
using (public.is_admin_or_manager() or created_by = auth.uid());

drop policy if exists "transactions_admin_manager_only" on public.transactions;
create policy "transactions_admin_manager_only"
on public.transactions for all
to authenticated
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

drop policy if exists "invites_admin_manager_only" on public.user_invites;
create policy "invites_admin_manager_only"
on public.user_invites for all
to authenticated
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager());

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

drop policy if exists "project_files_public_read" on storage.objects;
create policy "project_files_public_read"
on storage.objects for select
to public
using (bucket_id = 'project-files');

drop policy if exists "project_files_authenticated_insert" on storage.objects;
create policy "project_files_authenticated_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-files');

drop policy if exists "project_files_authenticated_update" on storage.objects;
create policy "project_files_authenticated_update"
on storage.objects for update
to authenticated
using (bucket_id = 'project-files')
with check (bucket_id = 'project-files');

drop policy if exists "project_files_authenticated_delete" on storage.objects;
create policy "project_files_authenticated_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-files');

do $$
declare
  rel_name text;
begin
  foreach rel_name in array array[
    'profiles',
    'user_preferences',
    'company_settings',
    'integration_settings',
    'notifications',
    'leads',
    'clients',
    'projects',
    'transactions',
    'events'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_publication p on p.oid = pr.prpubid
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = rel_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', rel_name);
    end if;
  end loop;
end $$;
