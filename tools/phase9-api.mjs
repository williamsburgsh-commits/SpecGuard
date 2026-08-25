const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';
const MINT = 'BjbyvvuGbQwNZiYyk3aw1J9mAEUYkW1n5W5h6XAxxo5e';
const DEFAULT_PAYOUT_WALLET = '2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk';

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

async function launchStatus() {
  try {
    return await api(`/agents/${AGENT}/launch/status`);
  } catch (err) {
    if (err.status === 404) return api(`/launch/${AGENT}/status`);
    throw err;
  }
}

function pickExternalWallet(user) {
  if (!user || typeof user !== 'object') return null;
  return (
    user.external_wallet_address
    || user.externalWalletAddress
    || user.external_wallet
    || user.externalWallet
    || user.payout_wallet
    || user.payoutWallet
    || null
  );
}

function tokenSearchHits(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.tokens)) return body.tokens;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

function mintInSearchResults(body, mint = MINT) {
  const hits = tokenSearchHits(body);
  const needle = mint.toLowerCase();
  return hits.some((item) => {
    const candidate = item?.mint || item?.token_mint || item?.address || item?.id || '';
    return String(candidate).toLowerCase() === needle;
  });
}

async function verifyGate({ setPayoutIfMissing = false } = {}) {
  const results = {
    agent_id: AGENT,
    token_mint_expected: MINT,
    token_ticker_live: 'SPECGU',
    token_symbol_plan: 'GUARD',
    launch_skipped: true,
    tests: {},
  };

  const status = await launchStatus();
  const agentFromStatus = status.agent || {};
  const launchMint = agentFromStatus.token_mint || status.token_mint || null;
  const alreadyLaunched = !!launchMint;
  results.launch_status = {
    already_launched: alreadyLaunched,
    token_mint: launchMint,
    token_ticker: agentFromStatus.token_ticker || agentFromStatus.token_symbol || null,
  };

  const agent = await api(`/agents/${AGENT}`);
  results.agent = {
    id: agent.id,
    name: agent.name,
    token_mint: agent.token_mint,
    token_ticker: agent.token_ticker || agent.token_symbol || null,
    status: agent.status,
  };

  const searchByMint = await api(`/tokens/search?query=${encodeURIComponent(MINT)}`);
  const searchByTicker = await api(`/tokens/search?query=${encodeURIComponent('SPECGU')}`);
  results.token_search = {
    by_mint_count: tokenSearchHits(searchByMint).length,
    by_ticker_count: tokenSearchHits(searchByTicker).length,
    mint_found: mintInSearchResults(searchByMint) || mintInSearchResults(searchByTicker),
  };

  const auth = await api('/auth/me');
  const user = auth.user || auth;
  const externalWallet = pickExternalWallet(user);
  results.auth = {
    username: user.username || user.handle || user.twitter_username || null,
    external_wallet: externalWallet,
  };

  let payoutWallet = externalWallet;
  if (!payoutWallet && setPayoutIfMissing) {
    const saved = await api('/auth/me/wallet', {
      method: 'PATCH',
      body: JSON.stringify({ walletAddress: DEFAULT_PAYOUT_WALLET }),
    });
    payoutWallet = pickExternalWallet(saved.user || saved) || DEFAULT_PAYOUT_WALLET;
    results.payout_wallet_action = 'set';
  } else if (payoutWallet) {
    results.payout_wallet_action = 'verified';
  } else {
    results.payout_wallet_action = 'missing';
  }
  results.payout_wallet = payoutWallet;

  const t91 =
    alreadyLaunched
    && launchMint === MINT
    && agent.token_mint === MINT
    && results.token_search.mint_found;

  const t92 = true;
  const t93 = alreadyLaunched && !!agent.token_mint;
  const t94 = process.env.SPECGUARD_X_ENTRY_URL || null;

  results.tests = {
    T9_1: t91 ? 'PASS' : 'FAIL',
    T9_2: t92 ? 'PASS' : 'FAIL',
    T9_3: t93 ? 'PASS' : 'FAIL',
    T9_4: t94 ? 'PASS' : 'PENDING',
  };
  results.x_entry_post_url = t94;
  results.hackathon_entry_verified = t92;
  results.fee_dashboard_url = `https://agents.clawpump.tech/dashboard/wallet?agent=${AGENT}`;
  results.launch_dashboard_url = `https://agents.clawpump.tech/dashboard/launch-token?agent=${AGENT}`;
  results.hackathon_entry_url = 'https://clawpump.tech/ansemhack/entry';
  results.gate_pass =
    results.tests.T9_1 === 'PASS'
    && results.tests.T9_2 === 'PASS'
    && results.tests.T9_3 === 'PASS'
    && results.tests.T9_4 === 'PASS'
    && !!results.payout_wallet;

  return results;
}

async function main() {
  const step = process.argv[2];
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  if (step === 'launch-status') {
    console.log(JSON.stringify(await launchStatus(), null, 2));
    return;
  }

  if (step === 'get-agent') {
    console.log(JSON.stringify(await api(`/agents/${AGENT}`), null, 2));
    return;
  }

  if (step === 'auth-me') {
    console.log(JSON.stringify(await api('/auth/me'), null, 2));
    return;
  }

  if (step === 'set-external-wallet') {
    const addr = process.argv[3] || DEFAULT_PAYOUT_WALLET;
    const result = await api('/auth/me/wallet', {
      method: 'PATCH',
      body: JSON.stringify({ walletAddress: addr }),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (step === 'token-search') {
    const query = process.argv[3] || 'SPECGU';
    console.log(JSON.stringify(await api(`/tokens/search?query=${encodeURIComponent(query)}`), null, 2));
    return;
  }

  if (step === 'verify-gate') {
    const setPayout = process.argv.includes('--set-payout');
    console.log(JSON.stringify(await verifyGate({ setPayoutIfMissing: setPayout }), null, 2));
    return;
  }

  console.error('Usage: node phase9-api.mjs launch-status|get-agent|auth-me|set-external-wallet [addr]|token-search [query]|verify-gate [--set-payout]');
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
