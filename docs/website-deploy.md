# Website deploy (Phoenix + Verification)

Dual-app layout: [`site/`](../site/) (Phoenix Perps, Vite) and [`web/`](../web/) (Verification, Next.js).

## Copy

Public strings: [website-copy.md](website-copy.md).

## Env

| Variable | App | Purpose |
|----------|-----|---------|
| `NEXT_PUBLIC_SITE_URL` | web | Canonical verification origin (badges, embeds) |
| `NEXT_PUBLIC_PHOENIX_URL` | web | Phoenix Perps link in header |
| `WEBHOOK_PUBLIC_URL` | web | Helius webhook base (same as verification host) |
| `VITE_REGISTRY_URL` | site | Verification app URL in Phoenix nav |

Example:

```env
NEXT_PUBLIC_SITE_URL=https://web-pi-opal-szwuxtcplv.vercel.app
NEXT_PUBLIC_PHOENIX_URL=https://specguard.xyz
VITE_REGISTRY_URL=https://web-pi-opal-szwuxtcplv.vercel.app
```

## Build

Verification (`web/`) uses **Tailwind 4**, **HeroUI v3**, and `@specguard/theme` (same stack direction as Phoenix `site/`). Install from repo root:

```bash
npm install
```

If Next chunk errors or stale bundles appear locally, remove `web/.next` and restart dev on port **3001**.

```bash
npm run web:build
cd site && npm run build
```

## Deploy

- **Verification:** Vercel/Railway root `web/` (existing `vercel.json` build).
- **Phoenix:** GitHub Pages or second Vercel project from `site/dist`.

## QA

```bash
npm install
npm run web:test
npm run web:build
npm run build -w specguard-site
npm run test:production-urls
```

### Visual quality (steer R1–R3)

Verification home uses `@specguard/theme` (mesh, Space Grotesk + Inter Tight, Pixelify on eyebrows only). Hero: canvas grid + orbit/scan + live reference panel (no rain/tape). Home is four sections: hero, products, reference agent, proof. Review locally with `npm run web:dev` (port **3001**) before shipping marketing changes.

## DB

Apply [`0011_rename_reference_agent.sql`](../supabase/migrations/0011_rename_reference_agent.sql) for public agent name **SpecGuard Reference**.
