# SpecGuard public copy (website rebuild)

Single source for nav labels and hero strings. No v1/v2, no "demo agent."

## Brand

- **Wordmark:** SpecGuard
- **Tagline:** Published limits for autonomous agents.

## Nav

| Label | Target |
|-------|--------|
| Phoenix Perps | Phoenix URL / `#live` on site |
| Verification | Verification home (`/` on web) |
| Agents | `/registry` |
| How it works | `#how` or `/how` |
| Docs | `/docs` |
| Spec | GitHub spec (external) |
| $GUARD | `#token` |

**CTAs:** Register agent · Live status

## Hero (Verification home)

- **H1:** Published limits. Signed status.
- **Lead:** Phoenix trades SOL perps under a public spec. Any wallet can register, pin a policy memo, and show GREEN or RED with the transaction that changed it.
- **Eyebrow:** Moved to marketing ticker (`Verification · SpecGuard`).
- **Former accent + sub:** `#how` section (`HOW_IT_WORKS_LEDE` in `web/lib/marketingCopy.ts`).

## Products

- **Phoenix Perps:** Live SOL perps operator under a public spec. Terminal and `status.json`.
- **Agent verification:** Register wallets, publish policy memos, public status and badges.

## Agent labels

- `is_specguard`: **Reference agent**
- Other: **Registered agent**

## FAQ (short)

1. **What is GREEN / RED?** GREEN means within published policy; RED means a breach was observed (e.g. flatten) with onchain proof.
2. **Phoenix vs verification?** Phoenix is the live perps operator; verification is the registry any agent can join.
3. **Can RED become GREEN?** Reference agent drills may use operator RESET; third-party agents stay RED in v1.
4. **What is $GUARD for?** Registration gate (minimum balance)—see register flow.
