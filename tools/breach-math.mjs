import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SPEC_URL = process.env.SPECGUARD_SPEC_URL ||
  'https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json';
export const STATUS_URL = process.env.SPECGUARD_STATUS_URL ||
  'https://williamsburgsh-commits.github.io/SpecGuard/status.json';

export function loadLocalSpec() {
  return JSON.parse(readFileSync(join(ROOT, 'spec', 'reference-spec.json'), 'utf8'));
}

export async function fetchSpec() {
  try {
    const res = await fetch(SPEC_URL, { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch { /* fall through */ }
  return loadLocalSpec();
}

export function heartbeatStale(statusData) {
  const ttl = statusData.heartbeat_ttl_seconds || 300;
  if (!statusData.last_heartbeat_at) return true;
  const ageSec = (Date.now() - Date.parse(statusData.last_heartbeat_at)) / 1000;
  return ageSec > ttl;
}

export async function fetchStatus() {
  try {
    const res = await fetch(STATUS_URL, { cache: 'no-store' });
    if (res.ok) {
      const remote = await res.json();
      if (!heartbeatStale(remote)) return remote;
    }
  } catch { /* fall through */ }
  try {
    const local = JSON.parse(readFileSync(join(ROOT, 'site', 'status.json'), 'utf8'));
    if (!heartbeatStale(local)) return local;
  } catch { /* fall through */ }
  return { last_heartbeat_at: null, heartbeat_ttl_seconds: 300, status: 'GREEN' };
}

function countLimitOrders(trader) {
  const raw = trader.limitOrders ?? trader.limit_orders ?? trader.orders ?? [];
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === 'object') {
    return Object.values(raw).reduce((sum, orders) => sum + (Array.isArray(orders) ? orders.length : 0), 0);
  }
  return 0;
}

export function accountMetrics(account) {
  const traders = account?.traders || account?.subaccounts || [];
  let collateral = 0;
  let unrealized = 0;
  let positionNotional = 0;
  let openOrderCount = 0;

  for (const t of traders) {
    collateral += Number(
      t.collateralUsd ?? t.collateral_usd ?? t.collateralBalance ?? t.collateral ?? t.effectiveCollateral ?? 0
    );
    unrealized += Number(t.unrealizedPnlUsd ?? t.unrealized_pnl_usd ?? t.unrealizedPnl ?? 0);
    for (const p of t.positions ?? []) {
      positionNotional += Math.abs(Number(p.positionValue ?? p.position_value ?? p.positionNotionalUsd ?? 0));
    }
    openOrderCount += countLimitOrders(t);
  }

  if (traders.length === 0) {
    const sub = account?.subaccounts?.[0] || account?.account || account || {};
    collateral = Number(sub.collateralUsd ?? sub.collateralBalance ?? sub.collateral ?? 0);
    unrealized = Number(sub.unrealizedPnlUsd ?? sub.unrealizedPnl ?? 0);
    positionNotional = Math.abs(Number(sub.positionNotionalUsd ?? sub.positionSizeUsd ?? 0));
    openOrderCount = countLimitOrders(sub);
  }

  const currentEquity = collateral + unrealized;
  const baseline = Number(process.env.SPECGUARD_BASELINE_EQUITY ?? currentEquity);
  const drawdown = Math.max(0, baseline - currentEquity);
  const leverage = collateral > 0 ? positionNotional / collateral : 0;
  return {
    collateral,
    unrealized,
    positionNotional,
    currentEquity,
    baseline,
    drawdown,
    leverage,
    inventory: positionNotional,
    openOrderCount,
  };
}

export function applySpecOverrides(spec) {
  const copy = { ...spec };
  if (process.env.SPECGUARD_MAX_INVENTORY_USD != null) {
    copy.max_inventory_usd = Number(process.env.SPECGUARD_MAX_INVENTORY_USD);
  }
  if (process.env.SPECGUARD_MAX_DRAWDOWN_USD != null) {
    copy.max_drawdown_usd = Number(process.env.SPECGUARD_MAX_DRAWDOWN_USD);
  }
  return copy;
}

export function evaluateAccountBreach({ spec, metrics, statusData }) {
  const reasons = [];
  if (heartbeatStale(statusData)) reasons.push('heartbeat_stale');
  if (metrics.drawdown > spec.max_drawdown_usd) reasons.push('max_drawdown');
  if (metrics.inventory > spec.max_inventory_usd) reasons.push('max_inventory');
  if (metrics.leverage > spec.max_leverage) reasons.push('max_leverage');
  return {
    breached: reasons.length > 0,
    reasons,
  };
}

export function evaluateCheck({ spec, metrics, tool, orderNotionalUsd, statusData }) {
  if (!spec.allowed_tools?.includes(tool)) {
    return { decision: 'BLOCK', reason: 'disallowed_tool' };
  }
  if (heartbeatStale(statusData)) {
    return { decision: 'BLOCK', reason: 'heartbeat_stale' };
  }
  if (metrics.drawdown > spec.max_drawdown_usd) {
    return { decision: 'BLOCK', reason: 'already_in_breach', subreason: 'max_drawdown' };
  }
  if (metrics.inventory > spec.max_inventory_usd) {
    return { decision: 'BLOCK', reason: 'already_in_breach', subreason: 'max_inventory' };
  }
  if (orderNotionalUsd != null && orderNotionalUsd > spec.max_notional_usd) {
    return { decision: 'BLOCK', reason: 'max_notional' };
  }
  const projectedInventory = metrics.inventory + (orderNotionalUsd || 0);
  if (projectedInventory > spec.max_inventory_usd) {
    return { decision: 'BLOCK', reason: 'max_inventory' };
  }
  if (metrics.leverage > spec.max_leverage) {
    return { decision: 'BLOCK', reason: 'max_leverage' };
  }
  return { decision: 'ALLOW', reason: 'within_spec' };
}
