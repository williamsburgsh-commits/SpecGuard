-- SpecGuard v2 — PnL snapshots (Slice 10)

create table public.pnl_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet text not null references public.agents (wallet) on delete cascade,
  computed_at timestamptz not null default now(),
  realized_usdc numeric not null,
  inventory_sol numeric not null,
  avg_cost_usdc numeric not null,
  baseline_usdc numeric not null default 0,
  peak_equity_usdc numeric not null,
  drawdown_pct numeric not null,
  mark_usdc numeric not null,
  through_sig text,
  created_at timestamptz not null default now()
);

create index if not exists pnl_snapshots_wallet_computed_idx
  on public.pnl_snapshots (wallet, computed_at desc);

alter table public.pnl_snapshots enable row level security;

create policy anon_select_pnl_snapshots
  on public.pnl_snapshots
  for select
  to anon, authenticated
  using (true);
