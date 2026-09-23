-- SpecGuard v2 — RLS for transactions (Slice 4)

alter table public.transactions enable row level security;
alter table public.webhook_events enable row level security;

create policy anon_select_transactions
  on public.transactions
  for select
  to anon, authenticated
  using (true);
