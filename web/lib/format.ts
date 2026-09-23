export function shortPubkey(pubkey: string, chars = 4): string {
  if (!pubkey) return "";
  return `${pubkey.slice(0, chars + 2)}…${pubkey.slice(-chars)}`;
}

export function formatUsdc(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatSol(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(4)} SOL`;
}

export function timeAgo(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function generateIdenticon(pubkey: string, size = 40): string {
  // Simple deterministic identicon using the pubkey hash
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    hash = ((hash << 5) - hash) + pubkey.charCodeAt(i);
    hash |= 0;
  }

  const colors = ["#00f5c4", "#00ff88", "#7b7bff", "#8888aa", "#ff3b3b"];
  const bgColor = colors[Math.abs(hash) % colors.length];
  const fgColor = colors[(Math.abs(hash) >> 8) % colors.length];

  // Create a simple SVG identicon
  const grid = 5;
  const cellSize = size / grid;
  const pattern: boolean[][] = [];

  let seed = Math.abs(hash);
  for (let y = 0; y < grid; y++) {
    pattern[y] = [];
    for (let x = 0; x < Math.ceil(grid / 2); x++) {
      const bit = (seed >> (y * Math.ceil(grid / 2) + x)) & 1;
      pattern[y][x] = bit === 1;
      pattern[y][grid - 1 - x] = bit === 1;
    }
  }

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="${bgColor}20" rx="8"/>`;

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (pattern[y][x]) {
        svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" opacity="0.8"/>`;
      }
    }
  }
  svg += `</svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function getStatusColor(status: "GREEN" | "RED"): string {
  return status === "GREEN" ? "var(--green)" : "var(--red)";
}

export function getStatusBg(status: "GREEN" | "RED"): string {
  return status === "GREEN" ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)";
}

export function getStatusBorder(status: "GREEN" | "RED"): string {
  return status === "GREEN" ? "var(--green)" : "var(--red)";
}