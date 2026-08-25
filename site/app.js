const AGENT_ID = '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const DASHBOARD_URL = `https://agents.clawpump.tech/dashboard/terminal?agent=${AGENT_ID}`;

function truncateHash(hash) {
  if (!hash || hash.length < 16) return hash || '—';
  return hash.slice(0, 8) + '…' + hash.slice(-8);
}

function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function renderLimitBar(elId, value, max) {
  const el = document.getElementById(elId);
  if (!el || max == null || max <= 0) return;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  el.className = 'limit-bar' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
  el.innerHTML = `<span style="width:${pct}%"></span>`;
}

function renderSigLink(elId, sig) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (sig) {
    el.innerHTML = `<a href="https://solscan.io/tx/${sig}" target="_blank" rel="noopener"><code>${sig.slice(0, 8)}…</code></a>`;
  } else {
    el.textContent = '—';
  }
}

function formatAge(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function computeDisplay(statusData) {
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

function renderBadge(displayStatus) {
  const badge = document.getElementById('status-badge');
  if (!badge) return;
  badge.textContent = displayStatus;
  badge.className = 'badge ' + (displayStatus === 'GREEN' ? 'green' : displayStatus === 'RED' ? 'red' : 'stale');
}

function updateHeroHint(computed) {
  const hint = document.getElementById('hero-status-hint');
  if (!hint) return;
  if (computed.displayStatus === 'GREEN') {
    hint.textContent = 'Operator live — heartbeat fresh, copy-trade eligible.';
  } else if (computed.displayStatus === 'STALE') {
    hint.textContent = `Heartbeat age ${formatAge(computed.ageSec)} (TTL ${computed.ttl}s). Operator may be restarting — check back shortly.`;
  } else if (computed.displayStatus === 'RED') {
    hint.textContent = 'Operator in breach or flatten state — copy-trade not eligible.';
  } else {
    hint.textContent = 'Loading operator state…';
  }
}

function updateNavTicker(data) {
  const el = document.getElementById('nav-updated');
  const dot = document.getElementById('nav-ticker-dot');
  if (el && data.last_heartbeat_at) {
    const t = new Date(data.last_heartbeat_at);
    el.textContent = `HB ${t.toISOString().slice(11, 19)}Z`;
  }
  if (dot) {
    dot.classList.toggle('live', !!data.last_heartbeat_at);
  }
}

async function loadStatus() {
  const res = await fetch('status.json?' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load status.json: HTTP ' + res.status);
  const data = await res.json();
  const computed = computeDisplay(data);

  renderBadge(computed.displayStatus);
  updateHeroHint(computed);
  updateNavTicker(data);

  const opEl = document.getElementById('operator-status');
  if (opEl) opEl.textContent = computed.operatorStatus;
  const dispEl = document.getElementById('display-status');
  if (dispEl) dispEl.textContent = computed.displayStatus;
  const hbEl = document.getElementById('last-heartbeat');
  if (hbEl) hbEl.textContent = data.last_heartbeat_at || 'never';
  const ageEl = document.getElementById('heartbeat-age');
  if (ageEl) ageEl.textContent = computed.ageSec == null ? '—' : formatAge(computed.ageSec);
  const ttlEl = document.getElementById('heartbeat-ttl');
  if (ttlEl) ttlEl.textContent = `${computed.ttl}s`;
  const copyEl = document.getElementById('copy-trade');
  if (copyEl) {
    copyEl.textContent = computed.copyEligible ? 'eligible' : 'not eligible';
    copyEl.className = computed.copyEligible ? 'eligible-yes' : 'eligible-no';
  }

  const marketEl = document.getElementById('market');
  if (marketEl) marketEl.textContent = data.market || '—';
  const specUrlEl = document.getElementById('spec-url');
  if (specUrlEl) {
    specUrlEl.href = data.spec_url;
    specUrlEl.textContent = data.spec_url;
  }
  const specLinkEl = document.getElementById('spec-link');
  if (specLinkEl) specLinkEl.href = data.spec_url;
  const heroSpecEl = document.getElementById('hero-spec-link');
  if (heroSpecEl) heroSpecEl.href = data.spec_url;
  const hashEl = document.getElementById('spec-hash');
  if (hashEl) hashEl.textContent = truncateHash(data.spec_sha256) + ' (' + data.spec_sha256 + ')';

  const q = data.quoting || {};
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('quote-operator', q.operator || '—');
  set('quote-spread', q.spread_bps != null ? `${q.spread_bps} bps` : '—');
  set('quote-last-cycle', q.last_cycle_at || '—');
  set('quote-last-action', q.last_action || '—');
  set('quote-cycles', q.cycles_total != null ? String(q.cycles_total) : '—');
  set('quote-counts', (q.posts_total != null && q.cancels_total != null) ? `${q.posts_total} / ${q.cancels_total}` : '—');
  set('quote-mark', q.last_mark_usd != null ? `$${q.last_mark_usd}` : '—');
  renderSigLink('quote-bid-sig', q.last_bid_sig);
  renderSigLink('quote-ask-sig', q.last_ask_sig);

  const pnl = data.pnl || {};
  const limits = pnl.spec_limits || {};
  set('pnl-baseline', formatUsd(pnl.baseline_equity_usd));
  set('pnl-current', formatUsd(pnl.current_equity_usd));
  set('pnl-unrealized', formatUsd(pnl.unrealized_pnl_usd));
  const ddEl = document.getElementById('pnl-drawdown');
  if (ddEl) {
    ddEl.innerHTML =
      `${formatUsd(pnl.drawdown_usd)} / ${formatUsd(limits.max_drawdown_usd)}` +
      `<div id="drawdown-bar" class="limit-bar"></div>`;
  }
  const invEl = document.getElementById('pnl-inventory');
  if (invEl) {
    invEl.innerHTML =
      `${formatUsd(pnl.inventory_usd)} / ${formatUsd(limits.max_inventory_usd)}` +
      `<div id="inventory-bar" class="limit-bar"></div>`;
  }
  set('pnl-leverage', (pnl.leverage != null && limits.max_leverage != null)
    ? `${pnl.leverage} / ${limits.max_leverage}` : '—');
  const withinEl = document.getElementById('pnl-within-spec');
  if (withinEl) {
    if (pnl.within_spec == null) {
      withinEl.textContent = '—';
      withinEl.className = '';
    } else {
      withinEl.textContent = pnl.within_spec ? 'yes' : 'no';
      withinEl.className = pnl.within_spec ? 'within-spec-yes' : 'within-spec-no';
    }
  }
  set('pnl-updated', pnl.updated_at || '—');
  renderLimitBar('drawdown-bar', pnl.drawdown_usd ?? 0, limits.max_drawdown_usd ?? 40);
  renderLimitBar('inventory-bar', pnl.inventory_usd ?? 0, limits.max_inventory_usd ?? 100);

  const fills = data.fills || {};
  set('fills-count', fills.count != null ? String(fills.count) : '0');
  set('fills-last-at', fills.last_fill_at || '—');
  set('fills-position', fills.position_size_sol != null ? `${fills.position_size_sol} SOL` : '—');
  renderSigLink('fills-sig', fills.last_fill_sig);

  const wallet = data.wallet_address;
  const agentId = data.agent_id || AGENT_ID;
  const walletLink = document.getElementById('wallet-link');
  if (walletLink) walletLink.href = 'https://solscan.io/account/' + wallet;
  const dashLink = document.getElementById('dashboard-link');
  if (dashLink) dashLink.href = DASHBOARD_URL.replace(AGENT_ID, agentId);
  const heroDash = document.getElementById('hero-dashboard-link');
  if (heroDash) heroDash.href = DASHBOARD_URL.replace(AGENT_ID, agentId);
  const navDash = document.getElementById('nav-dashboard-link');
  if (navDash) navDash.href = DASHBOARD_URL.replace(AGENT_ID, agentId);
  const portfolioLink = document.getElementById('portfolio-link');
  if (portfolioLink) portfolioLink.href = `https://agents.clawpump.tech/dashboard/terminal?agent=${agentId}&tab=portfolio`;
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!window.IntersectionObserver) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => obs.observe(el));
}

loadStatus().catch((err) => {
  const errEl = document.getElementById('load-error');
  if (errEl) {
    errEl.hidden = false;
    errEl.textContent = err.message;
  }
  renderBadge('ERROR');
  const hint = document.getElementById('hero-status-hint');
  if (hint) hint.textContent = 'Could not load live status — retrying…';
});

setInterval(loadStatus, 15000);
initReveal();
