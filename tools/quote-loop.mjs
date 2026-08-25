import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  SPEC_URL,
  fetchSpec,
  fetchStatus,
  accountMetrics,
  applySpecOverrides,
  evaluateAccountBreach,
  evaluateCheck,
} from './breach-math.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const QUOTES_DIR = join(ROOT, 'logs', 'quotes');
const SYMBOL = process.env.SPECGUARD_MARKET || 'SOL-PERP';
const SUBACCOUNT = Number(process.env.SPECGUARD_QUOTE_SUBACCOUNT ?? 1);
const SPREAD_BPS = Number(process.env.SPECGUARD_QUOTE_SPREAD_BPS ?? 500);
const QUANTITY = Number(process.env.SPECGUARD_QUOTE_QTY ?? 0.01);
const MARGIN_USDC = Number(process.env.SPECGUARD_QUOTE_MARGIN_USDC ?? 1.5);
const INTERVAL_MS = Number(process.env.SPECGUARD_QUOTE_INTERVAL_MS ?? 5 * 60 * 1000);

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

function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

function quotePrices(mark) {
  const halfSpread = SPREAD_BPS / 10000;
  return {
    mark,
    spread_bps: SPREAD_BPS,
    bid: roundPrice(mark * (1 - halfSpread)),
    ask: roundPrice(mark * (1 + halfSpread)),
    quantity: QUANTITY,
    bid_notional_usd: roundPrice(mark * (1 - halfSpread) * QUANTITY),
    ask_notional_usd: roundPrice(mark * (1 + halfSpread) * QUANTITY),
  };
}

function writeQuoteLog(payload) {
  if (!existsSync(QUOTES_DIR)) mkdirSync(QUOTES_DIR, { recursive: true });
  const path = join(QUOTES_DIR, `quote-${isoSafe(new Date())}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
  return path;
}

async function fetchAccount() {
  return api('/perps/account', {
    method: 'POST',
    body: JSON.stringify({ agent_id: AGENT }),
  });
}

async function fetchMark() {
  const data = await api('/perps/market-data', {
    method: 'POST',
    body: JSON.stringify({ symbol: SYMBOL }),
  });
  const mark = Number(data.markPrice ?? data.priceSummary?.mark ?? data.latestCandle?.markClose);
  if (!mark || Number.isNaN(mark)) throw new Error('mark price unavailable');
  return mark;
}

async function cancelAll(idempotencyKey) {
  return api('/perps/order/cancel', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: AGENT,
      symbol: SYMBOL,
      subaccountIndex: SUBACCOUNT,
      cancelAll: true,
      confirmRisk: true,
      idempotencyKey,
    }),
  });
}

async function executeOrder({ side, price, idempotencyKey, transferAmountUsdc }) {
  const body = {
    agent_id: AGENT,
    symbol: SYMBOL,
    side,
    orderType: 'limit',
    price,
    quantity: QUANTITY,
    postOnly: true,
    subaccountIndex: SUBACCOUNT,
    confirmRisk: true,
    idempotencyKey,
  };
  if (transferAmountUsdc != null) body.transferAmountUsdc = transferAmountUsdc;
  return api('/perps/order/execute', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function isolatedCollateral(account) {
  const traders = account?.traders || [];
  const sub = traders.find((t) => (t.subaccountIndex ?? t.subaccount_index) === SUBACCOUNT);
  return Number(sub?.collateralBalance ?? sub?.collateral ?? 0);
}

function extractSig(result) {
  return result?.signature || result?.txSignature || result?.tx_sig || result?.sig || null;
}

export async function runQuoteCycle({ dryRun = false } = {}) {
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  const now = new Date();
  const stamp = isoSafe(now);
  const summary = {
    at: now.toISOString(),
    agent_id: AGENT,
    market: SYMBOL,
    subaccount_index: SUBACCOUNT,
    spec_url: SPEC_URL,
    dry_run: dryRun,
  };

  const [spec, status, account, mark] = await Promise.all([
    fetchSpec(),
    fetchStatus(),
    fetchAccount(),
    fetchMark(),
  ]);
  const effectiveSpec = applySpecOverrides(spec);
  const metrics = accountMetrics(account);
  const breach = evaluateAccountBreach({ spec: effectiveSpec, metrics, statusData: status });
  const prices = quotePrices(mark);

  summary.mark_usd = mark;
  summary.prices = prices;
  summary.metrics = metrics;
  summary.status = status.status;
  summary.breach = breach;

  if (breach.breached) {
    summary.action = 'skip_breach';
    summary.log_path = writeQuoteLog(summary);
    return summary;
  }

  const bidCheck = evaluateCheck({
    spec: effectiveSpec,
    metrics,
    tool: 'perps_order_execute',
    orderNotionalUsd: prices.bid_notional_usd,
    statusData: status,
  });
  const askCheck = evaluateCheck({
    spec: effectiveSpec,
    metrics,
    tool: 'perps_order_execute',
    orderNotionalUsd: prices.ask_notional_usd,
    statusData: status,
  });
  summary.pre_checks = { bid: bidCheck, ask: askCheck };

  if (bidCheck.decision !== 'ALLOW' || askCheck.decision !== 'ALLOW') {
    summary.action = 'skip_pre_check_block';
    summary.log_path = writeQuoteLog(summary);
    return summary;
  }

  if (dryRun) {
    summary.action = 'dry_run_ok';
    summary.log_path = writeQuoteLog(summary);
    return summary;
  }

  const cancelResult = await cancelAll(`quote-cancel-${stamp}`);
  summary.cancel = cancelResult;
  summary.cancel_sig = extractSig(cancelResult);

  const isolatedBal = isolatedCollateral(account);
  const needsTransfer = isolatedBal < MARGIN_USDC;
  summary.isolated_collateral_before = isolatedBal;
  summary.transfer_per_order = needsTransfer ? MARGIN_USDC : null;

  const bidResult = await executeOrder({
    side: 'bid',
    price: prices.bid,
    idempotencyKey: `quote-bid-${stamp}`,
    transferAmountUsdc: needsTransfer ? MARGIN_USDC : undefined,
  });
  summary.bid = bidResult;
  summary.bid_sig = extractSig(bidResult);

  const askResult = await executeOrder({
    side: 'ask',
    price: prices.ask,
    idempotencyKey: `quote-ask-${stamp}`,
    transferAmountUsdc: needsTransfer ? MARGIN_USDC : undefined,
  });
  summary.ask = askResult;
  summary.ask_sig = extractSig(askResult);

  const afterAccount = await fetchAccount();
  summary.after_metrics = accountMetrics(afterAccount);
  summary.after_breach = evaluateAccountBreach({
    spec: effectiveSpec,
    metrics: summary.after_metrics,
    statusData: status,
  });
  summary.action = summary.after_breach.breached ? 'quoted_then_breach' : 'quoted';
  summary.log_path = writeQuoteLog(summary);
  return summary;
}

export function listQuoteLogs() {
  if (!existsSync(QUOTES_DIR)) return [];
  return readdirSync(QUOTES_DIR)
    .filter((f) => f.startsWith('quote-') && f.endsWith('.json'))
    .sort();
}

export function summarizeQuoteHistory() {
  const files = listQuoteLogs();
  let cycles = 0;
  let posts = 0;
  let cancels = 0;
  const sigs = [];

  for (const file of files) {
    const payload = JSON.parse(readFileSync(join(QUOTES_DIR, file), 'utf8'));
    if (payload.action === 'quoted' || payload.action === 'quoted_then_breach') cycles += 1;
    if (payload.bid_sig) { posts += 1; sigs.push(payload.bid_sig); }
    if (payload.ask_sig) { posts += 1; sigs.push(payload.ask_sig); }
    if (payload.cancel_sig) { cancels += 1; sigs.push(payload.cancel_sig); }
  }

  return { log_count: files.length, cycles, posts, cancels, sigs };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const loop = args.includes('--loop');
  const once = !loop;

  if (once) {
    const result = await runQuoteCycle({ dryRun });
    console.log(JSON.stringify(result, null, 2));
    if (result.action === 'skip_breach' || result.action === 'skip_pre_check_block') process.exit(2);
    return;
  }

  for (;;) {
    const result = await runQuoteCycle({ dryRun });
    console.log(JSON.stringify({ loop: true, ...result }, null, 2));
    await sleep(INTERVAL_MS);
  }
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch((e) => {
    console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
    process.exit(1);
  });
}
