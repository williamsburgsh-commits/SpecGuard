-- SpecGuard v2 — transactions + webhook_events (Slice 4)

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  signature text not null unique,
  payload jsonb not null,
  processed boolean not null default false,
  error text
);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at desc);

create table public.transactions (
  signature text primary key,
  wallet text not null references public.agents (wallet) on delete cascade,
  blocktime timestamptz not null,
  slot bigint,
  kind text not null,
  program_ids text[] not null default '{}',
  sol_delta_lamports bigint not null default 0,
  token_deltas jsonb not null default '{}'::jsonb,
  fee_lamports bigint not null default 0,
  success boolean not null default true,
  raw jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_wallet_blocktime_idx
  on public.transactions (wallet, blocktime desc);

create index if not exists transactions_kind_idx on public.transactions (kind);
