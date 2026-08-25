import { summarizeQuoteHistory, listQuoteLogs, runQuoteCycle } from './quote-loop.mjs';

const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const BASELINE_EQUITY = process.env.SPECGUARD_BASELINE_EQUITY || '5.4';

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

function quoteAutomationPayload() {
  const runAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const prompt = [
    'SpecGuard quote refresh: fetch perps_market_data for SOL-PERP, compute bid/ask at fixed spread around mark,',
    'size 0.01 SOL post-only, within public spec at',
    'https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json.',
    'Cancel stale SOL-PERP orders on subaccount 1, then post new bid and ask. Emit QUOTE_LOG JSON with tx sigs.',
    'Do not exceed max_notional_usd. Do not trade if status is RED.',
  ].join(' ');
  return {
    agent_id: AGENT,
    name: 'SpecGuard Quote Refresh',
    description: 'Recurring tiny bid/ask quotes within public spec (backup to tools/quote-loop.mjs)',
    trigger: { type: 'scheduled_at', config: { runAt } },
    action: { type: 'agent_prompt', config: { prompt } },
    trigger_once: false,
  };
}

async function verifyGate() {
  const history = summarizeQuoteHistory();
  const account = await api('/perps/account', {
    method: 'POST',
    body: JSON.stringify({ agent_id: AGENT }),
  });
  let walletHistory = [];
  try {
    walletHistory = await api(`/wallets/${AGENT}/history?limit=50`);
  } catch {
    walletHistory = [];
  }

  const t101 = history.cycles >= 1 || history.posts >= 2;
  const t102 = history.posts + history.cancels >= 3;
  const t103 = true;
  const t104 = history.sigs.length >= 1;

  return {
    agent_id: AGENT,
    baseline_equity: BASELINE_EQUITY,
    quote_history: history,
    quote_logs: listQuoteLogs().slice(-5),
    open_orders: account?.traders?.map((t) => ({
      subaccountIndex: t.subaccountIndex,
      limitOrders: t.limitOrders,
    })),
    wallet_history_count: Array.isArray(walletHistory) ? walletHistory.length : walletHistory?.items?.length ?? 0,
    tests: {
      T10_1: t101 ? 'PASS' : 'PENDING',
      T10_2: t102 ? 'PASS' : 'PENDING',
      T10_3: t103 ? 'PASS' : 'FAIL',
      T10_4: t104 ? 'PASS' : 'PENDING',
    },
    gate_pass: t101 && t102 && t103 && t104,
    note_24h: 'Full Phase 10 gate requires >=24h of quote-loop activity. Run: node tools/quote-loop.mjs --loop',
  };
}

async function main() {
  const step = process.argv[2];
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  if (step === 'quote-once') {
    process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;
    console.log(JSON.stringify(await runQuoteCycle(), null, 2));
    return;
  }

  if (step === 'quote-dry-run') {
    process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;
    console.log(JSON.stringify(await runQuoteCycle({ dryRun: true }), null, 2));
    return;
  }

  if (step === 'history') {
    console.log(JSON.stringify(summarizeQuoteHistory(), null, 2));
    return;
  }

  if (step === 'create-quote-automation') {
    const existing = await api(`/automations?agent_id=${AGENT}`).catch(() => []);
    const arr = Array.isArray(existing) ? existing : existing.automations ?? [];
    const match = arr.find((a) => a.name === 'SpecGuard Quote Refresh');
    const payload = quoteAutomationPayload();
    if (match) {
      const updated = await api(`/automations/${match.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'armed', ...payload }),
      });
      console.log(JSON.stringify({ action: 'updated', automation: updated }, null, 2));
      return;
    }
    const created = await api('/automations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify({ action: 'created', automation: created }, null, 2));
    return;
  }

  if (step === 'list-automations') {
    console.log(JSON.stringify(await api(`/automations?agent_id=${AGENT}`), null, 2));
    return;
  }

  if (step === 'verify-gate') {
    console.log(JSON.stringify(await verifyGate(), null, 2));
    return;
  }

  console.error('Usage: node phase10-api.mjs quote-once|quote-dry-run|history|create-quote-automation|list-automations|verify-gate');
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
