import { readFileSync, existsSync } from 'fs';
import { runQuoteCycle } from './quote-loop.mjs';
import {
  buildFullSnapshot,
  buildPnlBlock,
  detectFillEvent,
  fetchAccount,
  fetchWalletHistory,
  loadAccountBefore,
  loadStatusJson,
  saveAccountBefore,
  PHASE11_FILL_PATH,
} from './pnl-snapshot.mjs';
import { accountMetrics, fetchSpec } from './breach-math.mjs';

const BASELINE_EQUITY = process.env.SPECGUARD_BASELINE_EQUITY || '5.4';

async function verifyGate() {
  let status = {};
  try {
    status = loadStatusJson();
  } catch {
    status = {};
  }

  let snapshot;
  try {
    snapshot = await buildFullSnapshot();
  } catch (err) {
    return {
      error: err.message,
      tests: { T11_1: 'FAIL', T11_2: 'FAIL', T11_3: 'FAIL', T11_4: 'FAIL' },
      gate_pass: false,
    };
  }

  const fills = status.fills ?? snapshot.fills ?? { count: 0 };
  const fillSnapshotExists = existsSync(PHASE11_FILL_PATH);
  const pnl = status.pnl ?? snapshot.pnl;

  const t111 = (fills.count >= 1) || Boolean(fills.last_fill_sig) || fillSnapshotExists;
  const t112 = (pnl?.inventory_usd ?? 0) <= (pnl?.spec_limits?.max_inventory_usd ?? 100);
  const t113 = Boolean(pnl?.current_equity_usd != null && pnl?.baseline_equity_usd != null);
  const t114 = Boolean(pnl?.drawdown_usd != null);

  return {
    agent_id: snapshot.agent_id,
    fills,
    pnl,
    fill_snapshot: fillSnapshotExists ? PHASE11_FILL_PATH : null,
    tests: {
      T11_1: t111 ? 'PASS' : 'PENDING',
      T11_2: t112 ? 'PASS' : 'FAIL',
      T11_3: t113 ? 'PASS' : 'PENDING',
      T11_4: t114 ? 'PASS' : 'PENDING',
    },
    gate_pass: t111 && t112 && t113 && t114,
    note: t111 ? 'Fill detected' : 'Waiting for organic fill at 50 bps spread',
  };
}

async function detectFill() {
  const before = loadAccountBefore();
  const [account, walletHistory, spec] = await Promise.all([
    fetchAccount(),
    fetchWalletHistory(),
    fetchSpec(),
  ]);

  process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;
  const beforeMetrics = before?.account ? accountMetrics(before.account) : accountMetrics(account);
  const afterMetrics = accountMetrics(account);

  const status = loadStatusJson();
  const knownSigs = [
    status.fills?.last_fill_sig,
    ...(status.fills?.known_sigs ?? []),
  ].filter(Boolean);

  const fillEvent = detectFillEvent({
    beforeAccount: before?.account ?? null,
    afterAccount: account,
    beforeMetrics,
    afterMetrics,
    walletHistory,
    knownFillSigs: knownSigs,
  });

  return {
    before_path: before ? 'logs/phase11-account-before.json' : null,
    fill: fillEvent,
    pnl: buildPnlBlock(account, spec),
    positions: fillEvent.positions ?? [],
  };
}

async function main() {
  if (!process.env.CLAWPUMP_API_KEY) throw new Error('CLAWPUMP_API_KEY required');
  process.env.SPECGUARD_BASELINE_EQUITY = BASELINE_EQUITY;

  const step = process.argv[2];

  if (step === 'account-before') {
    const account = await fetchAccount();
    const path = saveAccountBefore(account);
    console.log(JSON.stringify({
      ok: true,
      path,
      inventory_sol: account?.traders?.find((t) => t.subaccountIndex === 1)?.positions?.length ?? 0,
    }, null, 2));
    return;
  }

  if (step === 'snapshot') {
    console.log(JSON.stringify(await buildFullSnapshot(), null, 2));
    return;
  }

  if (step === 'detect-fill') {
    console.log(JSON.stringify(await detectFill(), null, 2));
    return;
  }

  if (step === 'verify-gate') {
    console.log(JSON.stringify(await verifyGate(), null, 2));
    return;
  }

  if (step === 'quote-dry-run-tight') {
    process.env.SPECGUARD_QUOTE_SPREAD_BPS = '50';
    console.log(JSON.stringify(await runQuoteCycle({ dryRun: true }), null, 2));
    return;
  }

  console.error('Usage: node phase11-api.mjs account-before|snapshot|detect-fill|verify-gate|quote-dry-run-tight');
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
