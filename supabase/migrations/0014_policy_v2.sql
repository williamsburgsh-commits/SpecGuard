-- SpecGuard v2 — PolicyV2: generalize the registry beyond trading agents.
--
-- Note: policies.version already means "nth policy published by this wallet".
-- The policy *schema* version is a separate column, schema_version.

alter table public.agents
  add column if not exists agent_type text not null default 'trader'
  check (agent_type in ('trader', 'social', 'data', 'infra', 'general'));

alter table public.policies
  add column if not exists schema_version int not null default 1
  check (schema_version in (1, 2));

alter table public.policies
  add column if not exists agent_type text
  check (agent_type is null or agent_type in ('trader', 'social', 'data', 'infra', 'general'));

alter table public.policies
  add column if not exists daily_spend_sol numeric;

alter table public.policies
  add column if not exists social_limits jsonb;

alter table public.policies
  add column if not exists allowed_tools text[];

alter table public.policies
  add column if not exists denied_actions text[];

-- V2 policies for non-trading agents carry neither of these.
alter table public.policies alter column max_drawdown_pct drop not null;
alter table public.policies alter column allowed_venues drop not null;

create index if not exists agents_agent_type_idx on public.agents (agent_type);
