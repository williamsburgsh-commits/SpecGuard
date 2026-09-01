import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  fetchSpec,
  applySpecOverrides,
  accountMetrics,
  evaluateAccountBreach,
} from './breach-math.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const QUOTE_SUBACCOUNT = Number(process.env.SPECGUARD_QUOTE_SUBACCOUNT ?? 1);
const QUOTES_DIR = join(ROOT, 'logs', 'quotes');
const SOLANA_RPC = process.env.SPECGUARD_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const WALLET = process.env.SPECGUARD_WALLET || '2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk';

export const PHASE11_BEFORE_PATH = join(ROOT, 'logs', 'phase11-account-before.json');
export const PHASE11_FILL_PATH = join(ROOT, 'logs', 'phase11-fill-snapshot.json');

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

export async function fetchAccount() {
  return api('/perps/account', {
    method: 'POST',
    body: JSON.stringify({ agent_id: AGENT }),
  });
}

export async function fetchPortfolio() {
  return api(`/portfolio?agent_id=${AGENT}`);
}

export async function fetchWalletHistory(limit = 50) {
  const res = await api(`/wallets/${AGENT}/history?limit=${limit}`);
  return res.transactions ?? res.items ?? (Array.isArray(res) ? res : []);
}

function parsePositionSize(raw) {
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function findQuoteSubaccount(account) {
  const traders = account?.traders || account?.subaccounts || [];
  return traders.find((t) => (t.subaccountIndex ?? t.subaccount_index) === QUOTE_SUBACCOUNT) || null;
}

export function extractQuoteSubaccountPositions(account) {
  const sub = findQuoteSubaccount(account);
  const positions = sub?.positions ?? [];
  return positions.map((p) => ({
    symbol: p.symbol ?? p.market ?? 'SOL',
    position_size: parsePositionSize(p.positionSize ?? p.position_size ?? p.size),
    position_value_usd: Math.abs(Number(p.positionValue ?? p.position_value ?? 0)),
    unrealized_pnl_usd: Number(p.unrealizedPnl ?? p.unrealized_pnl ?? 0),
    entry_price: Number(p.entryPrice ?? p.entry_price ?? 0),
  }));
}

export function quoteSubaccountInventorySol(account) {
  const positions = extractQuoteSubaccountPositions(account);
  return positions.reduce((sum, p) => sum + Math.abs(p.position_size), 0);
}

function capPct(value, max) {
  if (max == null || max <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (Number(value) / Number(max)) * 100)) * 10) / 10;
}

export function buildPnlBlock(account, spec, now = new Date(), extras = {}) {
  const effectiveSpec = applySpecOverrides(spec);
  const metrics = accountMetrics(account, extras);
  const breach = evaluateAccountBreach({
    spec: effectiveSpec,
    metrics,
    statusData: { last_heartbeat_at: now.toISOString(), heartbeat_ttl_seconds: 300 },
  });
  const equity = metrics.currentEquity || 0;
  const trading = metrics.tradingPnl ?? 0;
  const returnPct = equity > 0 ? Math.round((trading / equity) * 1000) / 10 : 0;

  return {
    baseline_equity_usd: roundUsd(metrics.baseline),
    current_equity_usd: roundUsd(metrics.currentEquity),
    withdrawn_usd: roundUsd(metrics.withdrawn),
    realized_pnl_usd: roundUsd(metrics.realized),
    unrealized_pnl_usd: roundUsd(metrics.unrealized),
    trading_pnl_usd: roundUsd(trading),
    return_pct: returnPct,
    drawdown_usd: roundUsd(metrics.drawdown),
    inventory_usd: roundUsd(metrics.inventory),
    leverage: roundLeverage(metrics.leverage),
    drawdown_pct_of_cap: capPct(metrics.drawdown, effectiveSpec.max_drawdown_usd),
    inventory_pct_of_cap: capPct(metrics.inventory, effectiveSpec.max_inventory_usd),
    leverage_pct_of_cap: capPct(metrics.leverage, effectiveSpec.max_leverage),
    within_spec: !breach.breached,
    breach_reasons: breach.reasons,
    spec_limits: {
      max_drawdown_usd: effectiveSpec.max_drawdown_usd,
      max_inventory_usd: effectiveSpec.max_inventory_usd,
      max_leverage: effectiveSpec.max_leverage,
    },
    updated_at: now.toISOString(),
  };
}

function roundUsd(n) {
  return Math.round(Number(n) * 100) / 100;
}

function roundLeverage(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function extractTxSig(entry) {
  return entry?.signature ?? entry?.txSignature ?? entry?.tx_sig ?? entry?.sig ?? null;
}

function isFillLikeTx(entry) {
  const type = String(entry?.type ?? entry?.kind ?? entry?.category ?? '').toLowerCase();
  const desc = String(entry?.description ?? entry?.memo ?? '').toLowerCase();
  if (type.includes('fill') || type.includes('trade') || type.includes('perp')) return true;
  if (desc.includes('fill') || desc.includes('trade') || desc.includes('perp')) return true;
  return Boolean(entry?.fill || entry?.isFill);
}

export function collectQuoteSigs({ quoting = {}, quoteResult = null } = {}) {
  const sigs = new Set();
  for (const sig of [
    quoting.last_bid_sig,
    quoting.last_ask_sig,
    quoting.last_cancel_sig,
    quoteResult?.bid_sig,
    quoteResult?.ask_sig,
    quoteResult?.cancel_sig,
  ]) {
    if (sig) sigs.add(sig);
  }
  return sigs;
}

function priceDistance(a, b) {
  if (a == null || b == null) return Number.POSITIVE_INFINITY;
  return Math.abs(Number(a) - Number(b));
}

export function inferFillSigFromRestingOrder({
  afterAccount,
  priorQuoting = {},
  quoteResult = null,
}) {
  const positions = extractQuoteSubaccountPositions(afterAccount);
  const active = positions.find((p) => Math.abs(p.position_size) > 1e-9);
  if (!active) return null;

  const entry = active.entry_price;
  const side = active.position_size >= 0 ? 'bid' : 'ask';
  const priorBid = priorQuoting.last_mark_usd != null && priorQuoting.spread_bps != null
    ? priorQuoting.last_mark_usd * (1 - (priorQuoting.spread_bps / 10000) / 2)
    : null;
  const priorAsk = priorQuoting.last_mark_usd != null && priorQuoting.spread_bps != null
    ? priorQuoting.last_mark_usd * (1 + (priorQuoting.spread_bps / 10000) / 2)
    : null;

  let chosenSide = side;
  if (entry > 0 && priorBid != null && priorAsk != null) {
    chosenSide = priceDistance(entry, priorBid) <= priceDistance(entry, priorAsk) ? 'bid' : 'ask';
  }

  const sig = chosenSide === 'bid'
    ? (priorQuoting.last_bid_sig || quoteResult?.bid_sig)
    : (priorQuoting.last_ask_sig || quoteResult?.ask_sig);
  return sig || null;
}

async function fetchOnchainSignatures(limit = 100) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [WALLET, { limit }],
  };
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return (json.result || []).map((row) => ({
    signature: row.signature,
    timestamp: row.blockTime,
    date: row.blockTime ? new Date(row.blockTime * 1000).toISOString() : null,
  }));
}

function resolveFillSigFromHistory(history, { knownFillSigs = [], excludeSigs = new Set(), aroundMs = null }) {
  const known = new Set(knownFillSigs.filter(Boolean));
  const candidates = normalizeHistory(history).filter((entry) => {
    const sig = extractTxSig(entry);
    if (!sig || known.has(sig) || excludeSigs.has(sig)) return false;
    if (aroundMs != null && entry.date) {
      const delta = Math.abs(Date.parse(entry.date) - aroundMs);
      if (delta > 15 * 60 * 1000) return false;
    }
    return isFillLikeTx(entry) || entry?.side != null;
  });
  if (!candidates.length) return null;
  if (aroundMs != null) {
    candidates.sort((a, b) =>
      Math.abs(Date.parse(a.date) - aroundMs) - Math.abs(Date.parse(b.date) - aroundMs));
  }
  return extractTxSig(candidates[0]);
}

function findQuoteLogSigBeforeFill(fillAtIso, entryPrice = null) {
  if (!existsSync(QUOTES_DIR)) return null;
  const fillMs = Date.parse(fillAtIso);
  if (Number.isNaN(fillMs)) return null;

  const files = readdirSync(QUOTES_DIR)
    .filter((name) => name.startsWith('quote-') && name.endsWith('.json'))
    .sort()
    .reverse();

  let fallback = null;
  for (const name of files) {
    const quote = JSON.parse(readFileSync(join(QUOTES_DIR, name), 'utf8'));
    const atMs = Date.parse(quote.at);
    if (Number.isNaN(atMs) || atMs > fillMs) continue;

    const bidPrice = quote.prices?.bid ?? quote.bid?.price;
    const askPrice = quote.prices?.ask ?? quote.ask?.price;
    if (!fallback && (quote.bid_sig || quote.ask_sig)) fallback = quote.bid_sig || quote.ask_sig;

    if (entryPrice != null) {
      if (bidPrice != null && priceDistance(entryPrice, bidPrice) <= 0.05 && quote.bid_sig) {
        return quote.bid_sig;
      }
      if (askPrice != null && priceDistance(entryPrice, askPrice) <= 0.05 && quote.ask_sig) {
        return quote.ask_sig;
      }
    }
  }
  return fallback;
}

export async function backfillMissingFillSig(status) {
  const fills = status.fills ?? defaultFillsBlock();
  if (!fills.count || fills.last_fill_sig || !fills.last_fill_at) return fills.last_fill_sig;

  const snapshot = existsSync(PHASE11_FILL_PATH)
    ? JSON.parse(readFileSync(PHASE11_FILL_PATH, 'utf8'))
    : null;
  const afterAccount = snapshot?.after_account ?? null;
  const entryPrice = snapshot?.fill?.positions?.[0]?.entry_price
    ?? extractQuoteSubaccountPositions(afterAccount)[0]?.entry_price
    ?? null;

  let fillSig = findQuoteLogSigBeforeFill(fills.last_fill_at, entryPrice);

  if (!fillSig) {
    fillSig = inferFillSigFromRestingOrder({
      afterAccount,
      priorQuoting: {},
    });
  }

  if (!fillSig) {
    const exclude = collectQuoteSigs({ quoting: status.quoting || {} });
    const aroundMs = Date.parse(fills.last_fill_at);
    const [walletHistory, onchain] = await Promise.all([
      fetchWalletHistory(100).catch(() => []),
      fetchOnchainSignatures(100).catch(() => []),
    ]);
    fillSig = resolveFillSigFromHistory(walletHistory, {
      knownFillSigs: [fills.last_fill_sig],
      excludeSigs: exclude,
      aroundMs,
    }) || resolveFillSigFromHistory(onchain, {
      knownFillSigs: [fills.last_fill_sig],
      excludeSigs: exclude,
      aroundMs,
    });
  }

  if (fillSig) {
    fills.last_fill_sig = fillSig;
    status.fills = fills;
    if (existsSync(PHASE11_FILL_PATH)) {
      const snap = JSON.parse(readFileSync(PHASE11_FILL_PATH, 'utf8'));
      if (snap.fill) {
        snap.fill.fill_sig = fillSig;
        snap.fill.source = snap.fill.source || 'position_change';
        snap.fill.proof_sig = fillSig;
        snap.fill.proof_type = 'resting_order';
        writeFileSync(PHASE11_FILL_PATH, JSON.stringify(snap, null, 2) + '\n');
      }
    }
  }

  return fillSig;
}

function normalizeHistory(history) {
  return Array.isArray(history) ? history : [];
}

export function detectFillEvent({
  beforeAccount,
  afterAccount,
  beforeMetrics,
  afterMetrics,
  walletHistory,
  knownFillSigs = [],
  priorQuoting = {},
  quoteResult = null,
  now = new Date(),
}) {
  const beforeSize = beforeAccount
    ? quoteSubaccountInventorySol(beforeAccount)
    : (beforeMetrics?.inventory != null ? 0 : 0);
  const afterSize = afterAccount
    ? quoteSubaccountInventorySol(afterAccount)
    : 0;

  const beforeInv = beforeMetrics?.inventory ?? 0;
  const afterInv = afterMetrics?.inventory ?? 0;
  const positionOpened = afterSize > beforeSize + 1e-9 || afterInv > beforeInv + 0.01;

  if (!positionOpened) {
    return { filled: false };
  }

  const positions = afterAccount ? extractQuoteSubaccountPositions(afterAccount) : [];
  const active = positions.find((p) => Math.abs(p.position_size) > 1e-9);

  let fillSig = inferFillSigFromRestingOrder({ afterAccount, priorQuoting, quoteResult });
  if (!fillSig && active?.entry_price != null) {
    fillSig = findQuoteLogSigBeforeFill(now.toISOString(), active.entry_price);
  }

  const excludeSigs = collectQuoteSigs({ quoting: priorQuoting, quoteResult });

  return {
    filled: true,
    fill_sig: fillSig ?? null,
    position_size_sol: active ? active.position_size : afterSize,
    position_value_usd: active ? active.position_value_usd : afterInv,
    at: now.toISOString(),
    source: fillSig && excludeSigs.has(fillSig)
      ? 'resting_order'
      : (fillSig ? 'quote_log' : 'position_change'),
    positions,
  };
}

export function defaultFillsBlock() {
  return {
    count: 0,
    last_fill_at: null,
    last_fill_sig: null,
    position_size_sol: null,
  };
}

export function applyFillToStatus(status, fillEvent, { beforeAccount, afterAccount, beforeMetrics, afterMetrics }) {
  if (!fillEvent?.filled) return status;

  const fills = status.fills ?? defaultFillsBlock();
  const isNew = fillEvent.fill_sig
    ? fillEvent.fill_sig !== fills.last_fill_sig
    : fills.count === 0;

  if (!isNew && fills.count > 0) {
    if (fillEvent.fill_sig && !fills.last_fill_sig) {
      fills.last_fill_sig = fillEvent.fill_sig;
      status.fills = fills;
    }
    return status;
  }

  if (isNew) {
    fills.count = (fills.count || 0) + 1;
    fills.last_fill_at = fillEvent.at;
  }
  fills.last_fill_sig = fillEvent.fill_sig ?? fills.last_fill_sig;
  fills.position_size_sol = fillEvent.position_size_sol ?? fills.position_size_sol;
  status.fills = fills;

  if (!existsSync(PHASE11_FILL_PATH) || isNew) {
    writeFileSync(PHASE11_FILL_PATH, JSON.stringify({
      at: fillEvent.at,
      agent_id: AGENT,
      fill: fillEvent,
      before_account: beforeAccount ?? null,
      after_account: afterAccount ?? null,
      before_metrics: beforeMetrics ?? null,
      after_metrics: afterMetrics ?? null,
    }, null, 2) + '\n');
  }

  return status;
}

export async function buildFullSnapshot() {
  const [spec, account, portfolio, walletHistory] = await Promise.all([
    fetchSpec(),
    fetchAccount(),
    fetchPortfolio().catch(() => null),
    fetchWalletHistory().catch(() => []),
  ]);

  const tape = await fetchPhoenixTape(account).catch(() => null);
  const pnl = buildPnlBlock(account, spec, new Date(), {
    realizedPnlUsd: tape?.realized_pnl_usd,
    withdrawnUsd: Number(process.env.SPECGUARD_WITHDRAWN_USD ?? 0),
  });
  const positions = extractQuoteSubaccountPositions(account);

  return {
    agent_id: AGENT,
    pnl,
    positions,
    portfolio: portfolio ?? null,
    wallet_history_count: normalizeHistory(walletHistory).length,
    account,
  };
}

export function saveAccountBefore(account) {
  writeFileSync(PHASE11_BEFORE_PATH, JSON.stringify({
    at: new Date().toISOString(),
    agent_id: AGENT,
    account,
    positions: extractQuoteSubaccountPositions(account),
    inventory_sol: quoteSubaccountInventorySol(account),
  }, null, 2) + '\n');
  return PHASE11_BEFORE_PATH;
}

export function loadAccountBefore() {
  if (!existsSync(PHASE11_BEFORE_PATH)) return null;
  return JSON.parse(readFileSync(PHASE11_BEFORE_PATH, 'utf8'));
}

export function loadStatusJson() {
  return JSON.parse(readFileSync(join(ROOT, 'site', 'status.json'), 'utf8'));
}

const PHOENIX = process.env.PHOENIX_PERP_API || 'https://perp-api.phoenix.trade';

function roundPct(n) {
  return Math.round(Number(n) * 10) / 10;
}

function traderBySubaccount(account, index) {
  const traders = account?.traders || account?.subaccounts || [];
  return traders.find((t) => (t.subaccountIndex ?? t.subaccount_index) === index) || null;
}

async function phoenixGetJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
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

async function fetchAllPhoenixTrades(parentKey) {
  const trades = [];
  let cursor = null;
  for (let i = 0; i < 20; i += 1) {
    const params = new URLSearchParams({
      limit: '1000',
      trader_pda_index: '0',
    });
    if (cursor) params.set('cursor', cursor);
    const page = await phoenixGetJson(`${PHOENIX}/v1/traders/${parentKey}/trades_v2?${params}`);
    const rows = Array.isArray(page.data) ? page.data : [];
    trades.push(...rows);
    if (!page.hasMore || !page.nextCursor || rows.length === 0) break;
    cursor = page.nextCursor;
  }
  return trades;
}

export function summarizeTrades(trades) {
  let realized = 0;
  let fees = 0;
  let makers = 0;
  let takers = 0;
  for (const t of trades) {
    realized += Number(t.realizedPnl ?? t.realized_pnl ?? 0);
    fees += Number(t.fees ?? 0);
    if (String(t.liquidity).toLowerCase() === 'maker') makers += 1;
    else takers += 1;
  }
  const latest = trades[0] || null;
  return {
    count: trades.length,
    realized_pnl_usd: roundUsd(realized),
    fees_usd: roundUsd(fees),
    maker_count: makers,
    taker_count: takers,
    maker_pct: trades.length ? roundPct((makers / trades.length) * 100) : 0,
    last_fill_at: latest?.timestamp ?? null,
    last_fill_sig: latest?.signature ?? null,
    last_position_sol: latest?.baseLotsAfter != null ? Number(latest.baseLotsAfter) : null,
  };
}

export async function fetchPhoenixTape(account) {
  const isolated = traderBySubaccount(account, 1);
  const parent = traderBySubaccount(account, 0);
  const isolatedKey = isolated?.traderKey;
  const parentKey = parent?.traderKey;
  if (!isolatedKey || !parentKey) {
    throw new Error('Phoenix trader keys missing on perps_account');
  }

  const now = Date.now();
  const start = now - 30 * 24 * 3600 * 1000;
  const [pnlSeries, trades] = await Promise.all([
    phoenixGetJson(`${PHOENIX}/v1/traders/${isolatedKey}/pnl?resolution=1d&start_time=${start}&end_time=${now}`),
    fetchAllPhoenixTrades(parentKey),
  ]);

  const summary = summarizeTrades(trades);
  const lastPoint = Array.isArray(pnlSeries) && pnlSeries.length
    ? pnlSeries[pnlSeries.length - 1]
    : null;

  return {
    source: 'phoenix',
    isolated_trader: isolatedKey,
    parent_trader: parentKey,
    realized_pnl_usd: summary.realized_pnl_usd,
    cumulative_pnl_usd: lastPoint?.cumulativePnl != null ? roundUsd(lastPoint.cumulativePnl) : summary.realized_pnl_usd,
    fills: summary,
  };
}
