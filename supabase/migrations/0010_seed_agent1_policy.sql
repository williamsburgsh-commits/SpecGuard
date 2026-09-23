-- SpecGuard v2 — link agent #1 to onchain policy memo (Slice 3 sig)

insert into public.policies (
  wallet,
  version,
  memo_sig,
  blocktime,
  name,
  max_drawdown_pct,
  max_spend_per_tx_sol,
  allowed_venues,
  heartbeat_interval_sec,
  raw_json,
  policy_hash
)
values (
  'BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK',
  1,
  '49ZhysL44qeXABfk9ZVMUswo8otH7eeBvdQ658EGXTWodVtMcWVh2CG4mA1kBRwWNAspakFvC6tXNSrKXkN8Ap8R',
  timestamptz '2026-09-20T12:00:00Z',
  'SpecGuard Jupiter Demo',
  10,
  0.5,
  array['jupiter-swap', 'jupiter-trigger'],
  300,
  '{"version":1,"name":"SpecGuard Jupiter Demo","maxDrawdownPct":10,"maxSpendPerTxSol":0.5,"allowedVenues":["jupiter-swap","jupiter-trigger"],"heartbeatIntervalSec":300}'::jsonb,
  '05fd04d275a722e7196a1e70f45d072a58a2e145b888ab8153a589accfa1b055'
)
on conflict (memo_sig) do nothing;

update public.agents
set
  name = 'SpecGuard Jupiter Demo',
  registered_at = timestamptz '2026-09-20T12:00:00Z',
  registration_sig = '49ZhysL44qeXABfk9ZVMUswo8otH7eeBvdQ658EGXTWodVtMcWVh2CG4mA1kBRwWNAspakFvC6tXNSrKXkN8Ap8R',
  current_policy_id = (
    select id
    from public.policies
    where memo_sig = '49ZhysL44qeXABfk9ZVMUswo8otH7eeBvdQ658EGXTWodVtMcWVh2CG4mA1kBRwWNAspakFvC6tXNSrKXkN8Ap8R'
  ),
  updated_at = now()
where wallet = 'BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK';
