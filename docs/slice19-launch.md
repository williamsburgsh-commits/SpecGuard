# Slice 19 — v2 Registry on specguard.xyz (Phoenix unchanged)

## Decision (D1 option **b** + dual nav)

| Surface | Host | Routes |
|---------|------|--------|
| **Phoenix operator** | GitHub Pages apex `https://specguard.xyz` | Terminal, `status.json` (unchanged) |
| **v2 Registry** | Vercel (`NEXT_PUBLIC_SITE_URL`) | `/`, `/registry`, `/register`, `/agent/…`, `/badge/…`, `/api/*` |

Cross-links:

- Registry layout **SiteNav** → Phoenix terminal + `status.json`
- Phoenix Vite nav → **Policy registry** (`REGISTRY_URL` / `VITE_REGISTRY_URL`)
- `/phoenix` on Vercel → 302 to `NEXT_PUBLIC_PHOENIX_URL`

**Do not** stop `specguard-operator` or GitHub Pages deploy.

## Env (Vercel)

```env
NEXT_PUBLIC_SITE_URL=https://registry.specguard.xyz
NEXT_PUBLIC_PHOENIX_URL=https://specguard.xyz
WEBHOOK_PUBLIC_URL=https://registry.specguard.xyz
```

Until DNS is ready, use the Vercel preview URL for `NEXT_PUBLIC_SITE_URL` and set Phoenix `VITE_REGISTRY_URL` to the same preview when rebuilding `site/`.

## DNS (Namecheap) — recommended

1. **Apex** `specguard.xyz` — keep GitHub Pages (A records / existing setup).
2. **Subdomain** `registry.specguard.xyz` — CNAME → `cname.vercel-dns.com`, add domain in Vercel project.
3. Helius webhook URL → `https://registry.specguard.xyz/api/webhooks/helius` (update if subdomain changes).

Alternative (Pro): apex on Vercel with `/` rewrites to Phoenix static export — not required for Slice 19 DoD.

## Deploy

```bash
npm run web:build
# Vercel CLI from repo root (web rootDirectory = web via vercel.json)
vercel deploy --prod
```

Set all env vars from `.env` on Vercel (Supabase, Helius, `CRON_SECRET`, public URLs).

Rebuild Phoenix site after setting `VITE_REGISTRY_URL`:

```bash
cd site && VITE_REGISTRY_URL=https://registry.specguard.xyz npm run build
```

## DoD checklist

- [ ] `https://<registry>/registry` loads agent table
- [ ] `https://specguard.xyz` Phoenix terminal still loads
- [ ] `https://specguard.xyz/status.json` returns 200 (operator still pushing)
- [ ] Nav links work both directions

```bash
REGISTRY_SMOKE_URL=https://your-vercel-url npm run test:production-urls
npm run web:test
```

## Crons

Daily crons on Hobby — use external scheduler for 5–10m if needed (`docs/vercel-cron-hobby.md`).
