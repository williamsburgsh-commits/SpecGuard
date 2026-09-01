import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { runQuoteCycle } from './quote-loop.mjs';
import { fetchSpec } from './breach-math.mjs';
import {
  applyFillToStatus,
  backfillMissingFillSig,
  buildPnlBlock,
  defaultFillsBlock,
  detectFillEvent,
  fetchAccount,
  fetchPhoenixTape,
  fetchWalletHistory,
} from './pnl-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const STATUS_PATHS = [
  join(ROOT, 'site', 'status.json'),
  join(ROOT, 'docs', 'status.json'),
];
const HEARTBEAT_DIR = join(ROOT, 'logs', 'heartbeat');
const BASELINE_EQUITY = process.env.SPECGUARD_BASELINE_EQUITY || '5.4';
export const OPERATOR_NAME = process.env.SPECGUARD_OPERATOR || 'github_actions';

export function loadStatus() {
  return JSON.parse(readFileSync(STATUS_PATHS[0], 'utf8'));
}

export function saveStatus(status) {
  const payload = JSON.stringify(status, null, 2) + '\n';
  for (const path of STATUS_PATHS) {
    writeFileSync(path, payload);
  }
}

function isoSafe(now) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function runHeartbeat(now, operatorName) {
  const at = now.toISOString();
  const proofRef = `logs/heartbeat/heartbeat-${isoSafe(now)}.json`;
  const proofPayload = {
    at,
    proof_type: 'repo_log',
    proof_ref: proofRef,
    memo: `specguard-hb-${Math.floor(now.getTime() / 1000)}`,
    content_hash: createHash('sha256').update(at).digest('hex'),
    operator: operatorName,
  };

  if (!existsSync(HEARTBEAT_DIR)) mkdirSync(HEARTBEAT_DIR, { recursive: true });
  writeFileSync(join(ROOT, proofRef), JSON.stringify(proofPayload, null, 2) + '\n');

  const status = loadStatus();
  status.last_heartbeat_at = at;
  status.last_heartbeat_proof = proofRef;
  status.copy_trade_eligible = status.status === 'GREEN';
  saveStatus(status);

  return { at, proof_ref: proofRef };
}

function initQuoting(status, nowIso, operatorName) {
  if (!status.quoting) {
    status.quoting = {
      operator: operatorName,
      started_at: nowIso,
      cycles_total: 0,
      posts_total: 0,
      cancels_total: 0,
    };
  } else if (status.quoting.operator !== operatorName) {
    status.quoting.operator = operatorName;
  }
  return status.quoting;
}

function applyQuoteResult(status, quoteResult, operatorName) {
  const q = initQuoting(status, quoteResult.at, operatorName);
  q.last_cycle_at = quoteResult.at;
  q.last_action = quoteResult.action;
  q.last_mark_usd = quoteResult.mark_usd ?? q.last_mark_usd ?? null;
  q.spread_bps = quoteResult.prices?.spread_bps ?? q.spread_bps ?? 500;
  if (quoteResult.prices?.quantity != null) q.quantity_sol = quoteResult.prices.quantity;
  if (quoteResult.transfer_per_order != null) q.margin_usdc = quoteResult.transfer_per_order;

  if (quoteResult.bid_sig) q.last_bid_sig = quoteResult.bid_sig;
  if (quoteResult.ask_sig) q.last_ask_sig = quoteResult.ask_sig;
  if (quoteResult.cancel_sig) q.last_cancel_sig = quoteResult.cancel_sig;

  if (quoteResult.action === 'quoted') {
    q.cycles_total += 1;
    if (quoteResult.bid_sig) q.posts_total += 1;
    if (quoteResult.ask_sig) q.posts_total += 1;
    if (quoteResult.cancel_sig) q.cancels_total += 1;
    q.open_order_count = quoteResult.after_metrics?.openOrderCount ?? q.open_order_count ?? null;
  }

  status.quoting = q;
  status.copy_trade_eligible = status.status === 'GREEN';
  return status;
}

async function syncPnlAndFills(status, quoteResult, now, priorQuoting) {
  const [spec, account, walletHistory] = await Promise.all([
    fetchSpec(),
    fetchAccount(),
    fetchWalletHistory().catch(() => []),
  ]);

  const tape = await fetchPhoenixTape(account).catch(() => null);
  status.pnl = buildPnlBlock(account, spec, now, {
    realizedPnlUsd: tape?.realized_pnl_usd,
    withdrawnUsd: Number(process.env.SPECGUARD_WITHDRAWN_USD ?? 0),
  });
  if (!status.fills) status.fills = defaultFillsBlock();

  if (tape?.fills) {
    status.fills = {
      count: tape.fills.count,
      maker_count: tape.fills.maker_count,
      taker_count: tape.fills.taker_count,
      maker_pct: tape.fills.maker_pct,
      last_fill_at: tape.fills.last_fill_at,
      last_fill_sig: tape.fills.last_fill_sig,
      position_size_sol: tape.fills.last_position_sol
        ?? quoteResult?.after_metrics?.positionSize
        ?? status.fills.position_size_sol
        ?? null,
      source: 'phoenix',
    };
    return { fillEvent: { filled: false, source: 'phoenix_tape' }, account, tape };
  }

  const knownSigs = [status.fills.last_fill_sig].filter(Boolean);
  const fillEvent = detectFillEvent({
    beforeMetrics: quoteResult?.metrics ?? null,
    afterMetrics: quoteResult?.after_metrics ?? null,
    afterAccount: account,
    walletHistory,
    knownFillSigs: knownSigs,
    priorQuoting,
    quoteResult,
    now,
  });

  applyFillToStatus(status, fillEvent, {
    beforeMetrics: quoteResult?.metrics ?? null,
    afterMetrics: quoteResult?.after_metrics ?? null,
    afterAccount: account,
  });

  await backfillMissingFillSig(status);

  return { fillEvent, account, tape: null };
}

export async function runOperatorCycle({ operatorName = OPERATOR_NAME } = {}) {
  if (!process.env.CLAWPUMP_API_KEY) throw new Error('CLAWPUMP_API_KEY required');

  process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;
  const now = new Date();
  const heartbeat = runHeartbeat(now, operatorName);

  let quoteResult;
  let quoteError = null;
  try {
    quoteResult = await runQuoteCycle();
  } catch (err) {
    quoteError = {
      message: err.message,
      status: err.status,
      body: err.body,
    };
  }

  let pnlSync = null;
  try {
    let status = loadStatus();
    const priorQuoting = status.quoting ? { ...status.quoting } : {};
    if (quoteResult) status = applyQuoteResult(status, quoteResult, operatorName);
    pnlSync = await syncPnlAndFills(status, quoteResult, now, priorQuoting);
    saveStatus(status);
  } catch (err) {
    if (!quoteError) {
      quoteError = { message: err.message, phase: 'pnl_sync' };
    }
  }

  const status = loadStatus();
  return {
    ok: true,
    operator: operatorName,
    heartbeat,
    quote: quoteResult ?? null,
    quote_error: quoteError,
    pnl: status.pnl ?? null,
    fills: status.fills ?? null,
    fill_detected: pnlSync?.fillEvent?.filled ?? false,
    quoting: status.quoting ?? null,
    status_path: 'site/status.json',
  };
}
