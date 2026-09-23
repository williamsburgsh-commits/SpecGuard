-- SpecGuard v2 — verify rate limit + Realtime on agents (Slice 11)

create table if not exists public.verify_requests (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  ip_hash text not null,
  requested_at timestamptz not null default now()
);

create index if not exists verify_requests_wallet_requested_idx
  on public.verify_requests (wallet, requested_at desc);

alter table public.verify_requests enable row level security;

-- Service role only (no anon/authenticated policies).

do $$
begin
  alter publication supabase_realtime add table public.agents;
exception
  when duplicate_object then null;
end $$;
