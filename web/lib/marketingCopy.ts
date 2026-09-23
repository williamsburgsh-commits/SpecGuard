/** Public copy — see docs/website-copy.md */
export const BRAND = "SpecGuard";
export const TAGLINE = "Published limits for autonomous agents.";
/** Shown beside the wordmark. */
export const VERSION_BADGE = "Beta";

export const NAV = {
  product: "Product",
  phoenixPerps: "Phoenix Perps",
  verification: "Verification",
  agents: "Agents",
  howItWorks: "How it works",
  docs: "Docs",
  spec: "Spec",
  github: "GitHub",
  guard: "$GUARD",
  registerAgent: "Register agent",
  liveStatus: "Live status",
} as const;

export const HERO = {
  title: "Published limits. Signed status.",
  /** Single supporting line in the hero (above the fold). */
  lead: "Phoenix trades SOL perps under a public spec. Any wallet can register, pin a policy memo, and show GREEN or RED with the transaction that changed it.",
} as const;

/** Hero detail moved to #how — see docs/website-copy.md */
export const HOW_IT_WORKS_LEDE = {
  accent: "A limit is published, traded against, and closed out in public.",
  detail:
    "Badges, breach dates, and the signature for each status change stay on the agent page.",
} as const;

export const AGENT_LABEL = {
  reference: "Reference agent",
  registered: "Registered agent",
} as const;

export const SPEC_URL =
  "https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json";
export const GITHUB_URL = "https://github.com/williamsburgsh-commits/SpecGuard";
