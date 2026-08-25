import { readFileSync, writeFileSync, existsSync } from 'fs';
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

export function buildPnlBlock(account, spec, now = new Date()) {
  const effectiveSpec = applySpecOverrides(spec);
  const metrics = accountMetrics(account);
  const breach = evaluateAccountBreach({
    spec: effectiveSpec,
    metrics,
    statusData: { last_heartbeat_at: now.toISOString(), heartbeat_ttl_seconds: 300 },
  });

  return {
    baseline_equity_usd: metrics.baseline,
    current_equity_usd: roundUsd(metrics.currentEquity),
    unrealized_pnl_usd: roundUsd(metrics.unrealized),
    drawdown_usd: roundUsd(metrics.drawdown),
    inventory_usd: roundUsd(metrics.inventory),
    leverage: roundLeverage(metrics.leverage),
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

  const history = normalizeHistory(walletHistory);
  const known = new Set(knownFillSigs.filter(Boolean));
  const newFillTx = history.find((entry) => {
    const sig = extractTxSig(entry);
    if (!sig || known.has(sig)) return false;
    return isFillLikeTx(entry) || entry?.side != null;
  });

  if (!positionOpened && !newFillTx) {
    return { filled: false };
  }

  const positions = afterAccount ? extractQuoteSubaccountPositions(afterAccount) : [];
  const active = positions.find((p) => Math.abs(p.position_size) > 1e-9);

  return {
    filled: true,
    fill_sig: extractTxSig(newFillTx) ?? null,
    position_size_sol: active ? active.position_size : afterSize,
    position_value_usd: active ? active.position_value_usd : afterInv,
    at: now.toISOString(),
    source: newFillTx ? 'wallet_history' : 'position_change',
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
    status.fills = fills;
    return status;
  }

  fills.count = (fills.count || 0) + 1;
  fills.last_fill_at = fillEvent.at;
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

  const pnl = buildPnlBlock(account, spec);
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
