const BASE = process.env.CLAWPUMP_API_URL || 'https://ai-agents-production-6ca0.up.railway.app';
const KEY = process.env.CLAWPUMP_API_KEY;
const AGENT = process.env.CLAWPUMP_DEFAULT_AGENT || '89ca5e76-d59f-4276-8399-eecdf8bb3a04';

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

function flattenAutomationPayload() {
  const runAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const prompt = 'SpecGuard automation flatten: fetch perps_account, check public spec limits at https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/spec/reference-spec.json. If breached, cancel ALL SOL-PERP orders immediately with confirmRisk. Emit ENFORCEMENT_LOG JSON with tx sigs. Do not open new risk.';
  return {
    agent_id: AGENT,
    name: 'SpecGuard Flatten Watcher',
    description: 'On trigger: run specguard-enforcer flatten poll (cancel all SOL-PERP orders)',
    trigger: { type: 'scheduled_at', config: { runAt } },
    action: { type: 'agent_prompt', config: { prompt } },
    trigger_once: false,
  };
}

async function main() {
  const step = process.argv[2];
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  if (step === 'list') {
    const result = await api(`/automations?agent_id=${AGENT}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (step === 'create-flatten') {
    const existing = await api(`/automations?agent_id=${AGENT}`).catch(() => []);
    const arr = Array.isArray(existing) ? existing : existing.automations ?? [];
    const match = arr.find((a) => a.name === 'SpecGuard Flatten Watcher');
    if (match) {
      const updated = await api(`/automations/${match.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'armed', ...flattenAutomationPayload() }),
      });
      console.log(JSON.stringify({ action: 'updated', automation: updated }, null, 2));
      return;
    }
    const created = await api('/automations', {
      method: 'POST',
      body: JSON.stringify(flattenAutomationPayload()),
    });
    console.log(JSON.stringify({ action: 'created', automation: created }, null, 2));
    return;
  }

  if (step === 'trigger') {
    const id = process.argv[3];
    if (!id) throw new Error('automation id required');
    const result = await api(`/automations/${id}/run`, { method: 'POST' });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (step === 'get') {
    const id = process.argv[3];
    if (!id) throw new Error('automation id required');
    const result = await api(`/automations/${id}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error('Usage: node phase8-api.mjs list|create-flatten|trigger <id>|get <id>');
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
