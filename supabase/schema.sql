-- PulseX schema. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.

create extension if not exists pgcrypto;

-- ---------- profiles (one row per user, holds settings) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  built_in boolean not null default false,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- tasks ----------
create table if not exists public.tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  notes text,
  category_id text not null,
  priority text not null default 'medium',
  status text not null default 'todo',
  due_at timestamptz,
  time_spent int,
  reminder_minutes int not null default 15,
  recurrence jsonb not null default '{"freq":"none"}'::jsonb,
  blocked boolean not null default false,
  series_id text,
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_at);

-- ---------- weekly reports ----------
create table if not exists public.reports (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  week_start timestamptz not null,
  week_end timestamptz not null,
  subject text not null,
  text text not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  foreach t in array array['profiles','categories','tasks','reports'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- row level security: each person sees only their own rows ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles: own" on public.profiles;
create policy "profiles: own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "categories: own" on public.categories;
create policy "categories: own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks: own" on public.tasks;
create policy "tasks: own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports: own" on public.reports;
create policy "reports: own" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- realtime (multi-device live updates) ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reports') then
    alter publication supabase_realtime add table public.reports;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
