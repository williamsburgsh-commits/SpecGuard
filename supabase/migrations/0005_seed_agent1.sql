-- SpecGuard v2 — registry demo agent #1 (Slice 3 onchain registration)

insert into public.agents (
  wallet,
  name,
  is_specguard,
  registered_at,
  registration_sig,
  status,
  status_since
)
values (
  'BS3SrBb8ewajtkcefBGZdsvUNrdYEuRP9QyVNn8EgrUK',
  'SpecGuard Reference',
  true,
  now(),
  '49ZhysL44qeXABfk9ZVMUswo8otH7eeBvdQ658EGXTWodVtMcWVh2CG4mA1kBRwWNAspakFvC6tXNSrKXkN8Ap8R',
  'GREEN',
  now()
)
on conflict (wallet) do update set
  name = excluded.name,
  is_specguard = excluded.is_specguard,
  registration_sig = excluded.registration_sig,
  updated_at = now();
