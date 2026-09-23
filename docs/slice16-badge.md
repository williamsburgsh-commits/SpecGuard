# Slice 16 — Badge SVG + embed

## Route

`GET /badge/[wallet]` — `image/svg+xml`

| Agent state | Right segment |
|-------------|----------------|
| GREEN | Verified |
| RED | BREACHED `YYYY-MM-DD` (from `first_breach_event`, else `status_since`) |
| Unknown wallet | Not registered (grey) |

Query params (optional): `?style=flat|plastic`, `?label=Custom`

Cache: `public, max-age=0, s-maxage=30, stale-while-revalidate=60`

CORS: `*` on `/badge/*` via `middleware.ts`

## Embed

`/agent/[wallet]` shows live badge + HTML snippet from `buildEmbedHtml()`.

```html
<a href="…/agent/WALLET"><img src="…/badge/WALLET" alt="SpecGuard status" height="20"></a>
```

## DoD

1. Open `/badge/<wallet>` — SVG for registered agent (GREEN or RED).
2. Embed snippet on agent page loads badge in README-style `<img>`.
3. After flatten drill (Slice 8), RED badge shows breach date.

```bash
npm run web:test
npm run web:build
```

Test unknown wallet: `/badge/11111111111111111111111111111111` → grey “Not registered”.
