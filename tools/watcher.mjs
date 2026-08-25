import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SPEC_URL,
  fetchSpec,
  fetchStatus,
  accountMetrics,
  applySpecOverrides,
  evaluateAccountBreach,
} from './breach-math.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const FLATTEN_DIR = join(ROOT, 'logs', 'flatten');
const ENFORCEMENT_DIR = join(ROOT, 'logs', 'enforcement');

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(body.error || body.message || text || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function isoSafe(now) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function subaccountsWithOrders(account) {
  const traders = account?.traders || [];
  const subs = [];
  for (const t of traders) {
    const raw = t.limitOrders ?? t.limit_orders ?? {};
    const ordersBySymbol = typeof raw === 'object' && !Array.isArray(raw) ? raw : { SOL: raw };
    let total = 0;
    for (const orders of Object.values(ordersBySymbol)) {
      if (Array.isArray(orders)) total += orders.length;
    }
    if (total > 0) {
      subs.push({
        subaccountIndex: t.subaccountIndex ?? t.subaccount_index ?? 0,
        orderCount: total,
      });
    }
  }
  return subs;
}

async function cancelAllOnSubaccount(subaccountIndex, idempotencyKey) {
  return api('/perps/order/cancel', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: AGENT,
      symbol: 'SOL-PERP',
      subaccountIndex,
      cancelAll: true,
      confirmRisk: true,
      idempotencyKey,
    }),
  });
}

async function flattenCancelAll(account) {
  const subs = subaccountsWithOrders(account);
  const signatures = [];
  if (subs.length === 0) {
    return { signatures, note: 'no_open_orders' };
  }
  for (const sub of subs) {
    const result = await cancelAllOnSubaccount(
      sub.subaccountIndex,
      `specguard-flatten-${sub.subaccountIndex}-${Date.now()}`
    );
    const sig = result.signature ?? result.txSignature ?? result.tx_signature ?? null;
    if (sig) signatures.push(sig);
  }
  return { signatures, subs: subs.map((s) => s.subaccountIndex) };
}

function writeFlattenLog(payload) {
  if (!existsSync(FLATTEN_DIR)) mkdirSync(FLATTEN_DIR, { recursive: true });
  const path = join(FLATTEN_DIR, `flatten-${isoSafe(new Date())}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
  return path;
}

function writeEnforcementLog(entry) {
  if (!existsSync(ENFORCEMENT_DIR)) mkdirSync(ENFORCEMENT_DIR, { recursive: true });
  const path = join(ENFORCEMENT_DIR, `enforcement-${isoSafe(new Date())}.json`);
  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n');
  return path;
}

async function main() {
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  const force = process.argv.includes('--force') || process.env.SPECGUARD_FORCE_FLATTEN === '1';
  const spec = applySpecOverrides(await fetchSpec());
  const statusData = await fetchStatus();
  const account = await api('/perps/account', { method: 'POST', body: JSON.stringify({ agent_id: AGENT }) });
  const metrics = accountMetrics(account);
  const breach = evaluateAccountBreach({ spec, metrics, statusData });

  const summary = {
    ok: true,
    agent_id: AGENT,
    force,
    breached: breach.breached,
    breach_reasons: breach.reasons,
    open_order_count: metrics.openOrderCount,
    metrics,
    action: 'none',
  };

  const shouldAct = force || breach.breached || metrics.openOrderCount > 0;
  if (!shouldAct) {
    summary.action = 'skip_no_breach_no_orders';
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  {
    const cancelResult = await flattenCancelAll(account);
    const at = new Date().toISOString();
    const flattenPayload = {
      at,
      trigger: force ? 'force' : 'breach',
      breach,
      metrics,
      cancel_sigs: cancelResult.signatures,
      close_sig: null,
      spec_url: SPEC_URL,
      note: 'Phase 8 gate — cancel only; full close in Phase 12',
    };
    const flattenPath = writeFlattenLog(flattenPayload);
    const enforcementPath = writeEnforcementLog({
      time: at,
      tool: 'watcher_flatten',
      mark_usd: null,
      inventory_usd: metrics.inventory,
      drawdown_usd: metrics.drawdown,
      order_notional_usd: null,
      decision: 'BLOCK',
      reason: force ? 'force_flatten' : breach.reasons.join(','),
      spec_url: SPEC_URL,
      tx_sigs: cancelResult.signatures,
      flatten_log: flattenPath.replace(/\\/g, '/').split('AnsemHack/').pop() || flattenPath,
    });
    summary.action = 'flatten_cancel';
    summary.cancel_sigs = cancelResult.signatures;
    summary.flatten_log = flattenPath;
    summary.enforcement_log = enforcementPath;
    summary.cancel_note = cancelResult.note;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
