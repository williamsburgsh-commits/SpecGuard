import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { runQuoteCycle } from './quote-loop.mjs';
import {
  applyFillToStatus,
  buildPnlBlock,
  defaultFillsBlock,
  detectFillEvent,
  fetchAccount,
  fetchSpec,
  fetchWalletHistory,
} from './pnl-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_PATHS = [
  join(ROOT, 'site', 'status.json'),
  join(ROOT, 'docs', 'status.json'),
];
const HEARTBEAT_DIR = join(ROOT, 'logs', 'heartbeat');
const BASELINE_EQUITY = process.env.SPECGUARD_BASELINE_EQUITY || '5.4';

function loadStatus() {
  return JSON.parse(readFileSync(STATUS_PATHS[0], 'utf8'));
}

function saveStatus(status) {
  const payload = JSON.stringify(status, null, 2) + '\n';
  for (const path of STATUS_PATHS) {
    writeFileSync(path, payload);
  }
}

function isoSafe(now) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function runHeartbeat(now) {
  const at = now.toISOString();
  const proofRef = `logs/heartbeat/heartbeat-${isoSafe(now)}.json`;
  const proofPayload = {
    at,
    proof_type: 'repo_log',
    proof_ref: proofRef,
    memo: `specguard-hb-${Math.floor(now.getTime() / 1000)}`,
    content_hash: createHash('sha256').update(at).digest('hex'),
    operator: 'github_actions',
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

function initQuoting(status, nowIso) {
  if (!status.quoting) {
    status.quoting = {
      operator: 'github_actions',
      started_at: nowIso,
      cycles_total: 0,
      posts_total: 0,
      cancels_total: 0,
    };
  }
  return status.quoting;
}

function applyQuoteResult(status, quoteResult) {
  const q = initQuoting(status, quoteResult.at);
  q.last_cycle_at = quoteResult.at;
  q.last_action = quoteResult.action;
  q.last_mark_usd = quoteResult.mark_usd ?? q.last_mark_usd ?? null;
  q.spread_bps = quoteResult.prices?.spread_bps ?? q.spread_bps ?? 500;

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

async function syncPnlAndFills(status, quoteResult, now) {
  const [spec, account, walletHistory] = await Promise.all([
    fetchSpec(),
    fetchAccount(),
    fetchWalletHistory().catch(() => []),
  ]);

  status.pnl = buildPnlBlock(account, spec, now);
  if (!status.fills) status.fills = defaultFillsBlock();

  const knownSigs = [status.fills.last_fill_sig].filter(Boolean);
  const fillEvent = detectFillEvent({
    beforeMetrics: quoteResult?.metrics ?? null,
    afterMetrics: quoteResult?.after_metrics ?? null,
    afterAccount: account,
    walletHistory,
    knownFillSigs: knownSigs,
    now,
  });

  applyFillToStatus(status, fillEvent, {
    beforeMetrics: quoteResult?.metrics ?? null,
    afterMetrics: quoteResult?.after_metrics ?? null,
    afterAccount: account,
  });

  return { fillEvent, account };
}

async function main() {
  if (!process.env.CLAWPUMP_API_KEY) throw new Error('CLAWPUMP_API_KEY required');

  process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;
  const now = new Date();
  const heartbeat = runHeartbeat(now);

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
    if (quoteResult) status = applyQuoteResult(status, quoteResult);
    pnlSync = await syncPnlAndFills(status, quoteResult, now);
    saveStatus(status);
  } catch (err) {
    if (!quoteError) {
      quoteError = { message: err.message, phase: 'pnl_sync' };
    }
  }

  const status = loadStatus();
  const out = {
    ok: true,
    operator: 'github_actions',
    heartbeat,
    quote: quoteResult ?? null,
    quote_error: quoteError,
    pnl: status.pnl ?? null,
    fills: status.fills ?? null,
    fill_detected: pnlSync?.fillEvent?.filled ?? false,
    quoting: status.quoting ?? null,
    status_path: 'site/status.json',
  };

  console.log(JSON.stringify(out, null, 2));
  if (quoteError && !quoteResult) process.exitCode = 1;
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
