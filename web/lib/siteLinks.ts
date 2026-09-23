/** Canonical verification origin (badges, embeds, Open Graph). */
export function resolveRegistrySiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, "") ??
    "http://localhost:3001"
  );
}

/** Legacy Phoenix host — used only for status.json proxy fallback. */
export function resolvePhoenixPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PHOENIX_URL?.replace(/\/$/, "") ??
    "https://specguard.xyz"
  );
}

export function resolvePhoenixStatusJsonUrl(): string {
  const registry = resolveRegistrySiteUrl();
  return `${registry}/status.json`;
}

export interface SiteNavLinks {
  registryHome: string;
  registry: string;
  register: string;
  phoenix: string;
  phoenixStatusJson: string;
  docs: string;
}

/** Internal App Router paths — single deployed site. */
export function getSiteNavLinks(): SiteNavLinks {
  return {
    registryHome: "/",
    registry: "/registry",
    register: "/register",
    phoenix: "/phoenix",
    phoenixStatusJson: "/status.json",
    docs: "/docs",
  };
}
