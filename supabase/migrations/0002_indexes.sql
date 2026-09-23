-- SpecGuard v2 — indexes (Slice 2)

create index if not exists policies_wallet_idx on public.policies (wallet);

create index if not exists policies_wallet_version_idx
  on public.policies (wallet, version desc);

create index if not exists agents_status_idx on public.agents (status);

create index if not exists agents_registered_at_idx
  on public.agents (registered_at desc nulls last);
