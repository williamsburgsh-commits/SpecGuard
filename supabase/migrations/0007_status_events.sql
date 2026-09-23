-- SpecGuard v2 — status_events + agents.first_breach FK (Slice 8)

create table public.status_events (
  id uuid primary key default gen_random_uuid(),
  wallet text not null references public.agents (wallet) on delete cascade,
  from_status text not null check (from_status in ('GREEN', 'RED')),
  to_status text not null check (to_status in ('GREEN', 'RED')),
  reason text not null,
  proof_sig text,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists status_events_wallet_occurred_idx
  on public.status_events (wallet, occurred_at desc);

create unique index if not exists status_events_proof_sig_unique
  on public.status_events (proof_sig)
  where proof_sig is not null;

alter table public.agents
  drop constraint if exists agents_first_breach_event_id_fkey;

alter table public.agents
  add constraint agents_first_breach_event_id_fkey
  foreign key (first_breach_event_id) references public.status_events (id) on delete set null;

alter table public.status_events enable row level security;

create policy anon_select_status_events
  on public.status_events
  for select
  to anon, authenticated
  using (true);

-- Realtime (Slice 8 DoD)
alter publication supabase_realtime add table public.status_events;
