-- SpecGuard v2 — RLS for public read (Slice 2 DoD)

alter table public.agents enable row level security;
alter table public.policies enable row level security;

create policy anon_select_agents
  on public.agents
  for select
  to anon, authenticated
  using (true);

create policy anon_select_policies
  on public.policies
  for select
  to anon, authenticated
  using (true);
