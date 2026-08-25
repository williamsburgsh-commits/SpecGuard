export function truncateHash(hash) {
  if (!hash || hash.length < 16) return hash || '—';
  return hash.slice(0, 8) + '…' + hash.slice(-8);
}

export function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Number(n).toFixed(2)}`;
}

export function formatAge(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export function computeDisplay(statusData) {
  const ttl = statusData.heartbeat_ttl_seconds || 300;
  const operatorStatus = statusData.status || 'UNKNOWN';
  const last = statusData.last_heartbeat_at ? Date.parse(statusData.last_heartbeat_at) : NaN;
  const ageSec = Number.isNaN(last) ? null : (Date.now() - last) / 1000;
  const isStale = !statusData.last_heartbeat_at || (ageSec != null && ageSec > ttl);
  let displayStatus = operatorStatus;
  if (operatorStatus === 'GREEN' && isStale) displayStatus = 'STALE';
  const copyEligible = operatorStatus === 'GREEN' && !isStale;
  return { ttl, operatorStatus, last, ageSec, isStale, displayStatus, copyEligible };
}

export function statusChipColor(displayStatus) {
  if (displayStatus === 'GREEN') return 'success';
  if (displayStatus === 'RED') return 'danger';
  if (displayStatus === 'STALE') return 'warning';
  return 'default';
}

export function heroHint(computed) {
  if (computed.displayStatus === 'GREEN') {
    return 'Operator live — heartbeat fresh, copy-trade eligible.';
  }
  if (computed.displayStatus === 'STALE') {
    return `Heartbeat age ${formatAge(computed.ageSec)} (TTL ${computed.ttl}s). Operator may be restarting — check back shortly.`;
  }
  if (computed.displayStatus === 'RED') {
    return 'Operator in breach or flatten state — copy-trade not eligible.';
  }
  return 'Loading operator state…';
}

export function limitProgressColor(pct) {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'success';
}

export function limitPct(value, max) {
  if (max == null || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
