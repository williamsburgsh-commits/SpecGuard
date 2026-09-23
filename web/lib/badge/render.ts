export type BadgeVisualState = "green" | "red" | "unknown";

export interface RenderBadgeOptions {
  state: BadgeVisualState;
  breachDate?: string | null;
  label?: string | null;
  style?: "flat" | "plastic";
  width?: number;
  height?: number;
  wallet?: string | null;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateWallet(wallet?: string | null): string {
  if (!wallet || wallet.length < 10) return "WALLET";
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function titleFor(state: BadgeVisualState, label?: string | null): string {
  if (label?.trim()) return label.trim();
  if (state === "green") return "SpecGuard Verified";
  if (state === "red") return "BREACHED";
  return "Not registered";
}

export function renderBadgeSvg(options: RenderBadgeOptions): string {
  const width = options.width ?? 220;
  const height = options.height ?? 40;
  const state = options.state;
  const title = escapeXml(titleFor(state, options.label));
  const sub = escapeXml(
    state === "red"
      ? options.breachDate?.trim() || truncateWallet(options.wallet)
      : truncateWallet(options.wallet),
  );

  const colors =
    state === "green"
      ? { bg: "#0f0f1a", border: "#00ff88", dot: "#00ff88", text: "#ffffff", sub: "#8888aa" }
      : state === "red"
        ? { bg: "#0f0f1a", border: "#ff3b3b", dot: "#ff3b3b", text: "#ff3b3b", sub: "#8888aa" }
        : { bg: "#0f0f1a", border: "#ffffff22", dot: "#8888aa", text: "#ffffff", sub: "#8888aa" };

  const blink =
    state === "red"
      ? `<animate attributeName="opacity" values="1;0.25;1" dur="0.8s" repeatCount="indefinite"/>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="SpecGuard ${state}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
  <circle cx="16" cy="${height / 2}" r="3" fill="${colors.dot}">${blink}</circle>
  <text x="28" y="${height / 2 - 3}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" font-weight="700" fill="${colors.text}">${title}</text>
  <text x="28" y="${height / 2 + 11}" font-family="ui-monospace,SFMono-Regular,monospace" font-size="9" fill="${colors.sub}">${sub}</text>
</svg>`;
}

export function formatBreachDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
