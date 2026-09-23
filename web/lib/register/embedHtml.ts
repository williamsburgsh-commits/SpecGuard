export function resolvePublicSiteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, "") ??
    "http://localhost:3001"
  );
}

export function buildEmbedHtml(wallet: string): string {
  const base = resolvePublicSiteBase();
  const badge = `${base}/badge/${wallet}`;
  const agent = `${base}/agent/${wallet}`;
  return `<a href="${agent}"><img src="${badge}" alt="SpecGuard status" height="20"></a>`;
}

export function badgeUrlForWallet(wallet: string): string {
  return `${resolvePublicSiteBase()}/badge/${wallet}`;
}
