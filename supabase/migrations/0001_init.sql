-- SpecGuard v2 — agents + policies (Slice 2)

create extension if not exists pgcrypto;

create table public.agents (
  wallet text primary key,
  name text not null default '',
  is_specguard boolean not null default false,
  registered_at timestamptz,
  registration_sig text,
  current_policy_id uuid,
  status text not null default 'GREEN' check (status in ('GREEN', 'RED')),
  status_since timestamptz not null default now(),
  first_breach_event_id uuid,
  last_tx_at timestamptz,
  last_tx_sig text,
  last_heartbeat_at timestamptz,
  last_heartbeat_sig text,
  guard_balance_at_registration numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  wallet text not null references public.agents (wallet) on delete cascade,
  version int not null,
  memo_sig text not null unique,
  blocktime timestamptz not null,
  name text not null,
  max_drawdown_pct numeric not null,
  max_spend_per_tx_sol numeric not null,
  allowed_venues text[] not null,
  heartbeat_interval_sec int not null,
  raw_json jsonb not null,
  policy_hash text not null,
  created_at timestamptz not null default now(),
  unique (wallet, version)
);

alter table public.agents
  add constraint agents_current_policy_id_fkey
  foreign key (current_policy_id) references public.policies (id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agents_set_updated_at
  before update on public.agents
  for each row
  execute function public.set_updated_at();
