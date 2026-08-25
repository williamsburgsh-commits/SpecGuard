import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SPEC_URL,
  fetchSpec,
  fetchStatus,
  accountMetrics,
  evaluateCheck,
} from './breach-math.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
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

function buildLogEntry({ tool, metrics, orderNotionalUsd, markUsd, result }) {
  return {
    time: new Date().toISOString(),
    tool,
    mark_usd: markUsd ?? null,
    inventory_usd: metrics.inventory,
    drawdown_usd: metrics.drawdown,
    order_notional_usd: orderNotionalUsd ?? null,
    decision: result.decision,
    reason: result.reason,
    spec_url: SPEC_URL,
    tx_sigs: [],
  };
}

function writeLog(entry) {
  if (!existsSync(ENFORCEMENT_DIR)) mkdirSync(ENFORCEMENT_DIR, { recursive: true });
  const path = join(ENFORCEMENT_DIR, `enforcement-${isoSafe(new Date())}.json`);
  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n');
  return path;
}

const SCENARIOS = {
  allow: {
    tool: 'perps_order_execute',
    orderNotionalUsd: 0.5,
    label: 'T7.1 within-spec 0.01 SOL @ $50',
  },
  block_notional: {
    tool: 'perps_order_execute',
    orderNotionalUsd: 500,
    label: 'T7.2 over max_notional_usd (5 SOL ~ $500)',
  },
  block_tool: {
    tool: 'sniper',
    orderNotionalUsd: null,
    label: 'T7.3 disallowed tool sniper',
  },
};

async function main() {
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  const scenarioKey = process.argv[2] || 'all';
  const spec = await fetchSpec();
  const statusData = await fetchStatus();
  let account = {};
  let markUsd = null;
  try {
    account = await api('/perps/account', { method: 'POST', body: JSON.stringify({ agent_id: AGENT }) });
    const md = await api('/perps/market-data', { method: 'POST', body: JSON.stringify({ symbol: 'SOL-PERP' }) });
    markUsd = Number(md?.markPrice ?? md?.mark_price ?? md?.price ?? null);
  } catch (e) {
    account = { warning: e.message };
  }
  const metrics = accountMetrics(account);

  const keys = scenarioKey === 'all' ? Object.keys(SCENARIOS) : [scenarioKey];
  const outputs = [];

  for (const key of keys) {
    const scenario = SCENARIOS[key];
    if (!scenario) {
      console.error('Unknown scenario:', key, '— use allow|block_notional|block_tool|all');
      process.exit(1);
    }
    const result = evaluateCheck({
      spec,
      metrics,
      tool: scenario.tool,
      orderNotionalUsd: scenario.orderNotionalUsd,
      statusData,
    });
    const entry = buildLogEntry({
      tool: scenario.tool,
      metrics,
      orderNotionalUsd: scenario.orderNotionalUsd,
      markUsd,
      result,
    });
    entry.scenario = key;
    entry.label = scenario.label;
    const path = writeLog(entry);
    outputs.push({ scenario: key, path, entry });
  }

  console.log(JSON.stringify({ ok: true, agent_id: AGENT, outputs }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
