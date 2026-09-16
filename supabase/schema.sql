-- =====================================================================
--  SALES CRM  —  full database schema
--  Paste this whole file into Supabase -> SQL Editor -> New query -> Run
--  Safe to re-run: everything is IF NOT EXISTS / idempotent.
-- =====================================================================

-- ---------------------------------------------------------------- utils
create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

-- ------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  company         text,
  currency        text    not null default 'USD',
  goal_dials      integer not null default 250,
  goal_connects   integer not null default 60,
  goal_meetings   integer not null default 10,
  goal_closes     integer not null default 2,
  goal_revenue    numeric(14,2) not null default 10000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------- accounts
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  website     text,
  industry    text,
  phone       text,
  city        text,
  country     text,
  employees   text,
  status      text not null default 'prospect',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- contacts
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid references public.accounts(id) on delete set null,
  first_name  text not null,
  last_name   text,
  title       text,
  email       text,
  phone       text,
  mobile      text,
  linkedin    text,
  status      text not null default 'new',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------- pipeline stages
create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  color       text not null default '#6366f1',
  probability integer not null default 50,
  kind        text not null default 'open',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- deals
create table if not exists public.deals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  account_id     uuid references public.accounts(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  stage_id       uuid references public.pipeline_stages(id) on delete set null,
  value          numeric(14,2) not null default 0,
  expected_close date,
  closed_at      timestamptz,
  status         text not null default 'open',
  source         text,
  notes          text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ------------------------------------------------------ stage move audit
create table if not exists public.deal_stage_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  deal_id       uuid not null references public.deals(id) on delete cascade,
  from_stage_id uuid,
  to_stage_id   uuid,
  changed_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  notes        text,
  due_date     date not null default current_date,
  due_time     time,
  type         text not null default 'follow_up',
  priority     text not null default 'normal',
  status       text not null default 'open',
  completed_at timestamptz,
  account_id   uuid references public.accounts(id) on delete cascade,
  contact_id   uuid references public.contacts(id) on delete cascade,
  deal_id      uuid references public.deals(id)    on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------ week logs
-- One row per ISO week. week_start is ALWAYS the Monday of that week.
create table if not exists public.week_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  week_start          date not null,
  dials               integer not null default 0,
  connects            integer not null default 0,
  conversations       integer not null default 0,
  meetings_booked     integer not null default 0,
  meetings_held       integer not null default 0,
  proposals_submitted integer not null default 0,
  closes              integer not null default 0,
  revenue             numeric(14,2) not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, week_start)
);

-- -------------------------------------------------------------- indexes
create index if not exists idx_accounts_user      on public.accounts(user_id);
create index if not exists idx_contacts_user      on public.contacts(user_id);
create index if not exists idx_contacts_account   on public.contacts(account_id);
create index if not exists idx_stages_user        on public.pipeline_stages(user_id, sort_order);
create index if not exists idx_deals_user         on public.deals(user_id);
create index if not exists idx_deals_stage        on public.deals(stage_id);
create index if not exists idx_deals_account      on public.deals(account_id);
create index if not exists idx_tasks_user_due     on public.tasks(user_id, due_date);
create index if not exists idx_tasks_status       on public.tasks(user_id, status);
create index if not exists idx_weeklogs_user_week on public.week_logs(user_id, week_start);
create index if not exists idx_stage_events_deal  on public.deal_stage_events(deal_id);

-- ------------------------------------------------------------- triggers
do $blk$
declare t text;
begin
  foreach t in array array['profiles','accounts','contacts','deals','tasks','week_logs'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $blk$;

-- --------------------------------------------------- row level security
alter table public.profiles          enable row level security;
alter table public.accounts          enable row level security;
alter table public.contacts          enable row level security;
alter table public.pipeline_stages   enable row level security;
alter table public.deals             enable row level security;
alter table public.deal_stage_events enable row level security;
alter table public.tasks             enable row level security;
alter table public.week_logs         enable row level security;

-- profiles keys off id; every other table keys off user_id
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $blk$
declare t text;
begin
  foreach t in array array['accounts','contacts','pipeline_stages','deals',
                           'deal_stage_events','tasks','week_logs'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all
       using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $blk$;

-- ------------------------------------------ auto-provision new signups
-- Creates a profile + a default 7-stage pipeline the moment you sign up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.pipeline_stages (user_id, name, sort_order, color, probability, kind) values
    (new.id, 'New Lead',    0, '#64748b', 10,  'open'),
    (new.id, 'Contacted',   1, '#0ea5e9', 25,  'open'),
    (new.id, 'Meeting Set', 2, '#8b5cf6', 45,  'open'),
    (new.id, 'Proposal',    3, '#f59e0b', 65,  'open'),
    (new.id, 'Negotiation', 4, '#f97316', 80,  'open'),
    (new.id, 'Closed Won',  5, '#22c55e', 100, 'won'),
    (new.id, 'Closed Lost', 6, '#ef4444', 0,   'lost');
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------- backfill an EXISTING account
-- If you signed up BEFORE running this file, this gives you the profile
-- and default stages you would otherwise have missed.
insert into public.profiles (id, full_name)
select u.id, split_part(u.email,'@',1) from auth.users u
on conflict (id) do nothing;

insert into public.pipeline_stages (user_id, name, sort_order, color, probability, kind)
select u.id, s.name, s.sort_order, s.color, s.probability, s.kind
from auth.users u
cross join (values
  ('New Lead',0,'#64748b',10,'open'),   ('Contacted',1,'#0ea5e9',25,'open'),
  ('Meeting Set',2,'#8b5cf6',45,'open'),('Proposal',3,'#f59e0b',65,'open'),
  ('Negotiation',4,'#f97316',80,'open'),('Closed Won',5,'#22c55e',100,'won'),
  ('Closed Lost',6,'#ef4444',0,'lost')
) as s(name, sort_order, color, probability, kind)
where not exists (select 1 from public.pipeline_stages p where p.user_id = u.id);
