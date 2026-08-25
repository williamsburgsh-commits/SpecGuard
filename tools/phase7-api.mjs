import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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

async function main() {
  const step = process.argv[2];
  if (!KEY) throw new Error('CLAWPUMP_API_KEY required');

  if (step === 'list') {
    const skills = await api(`/skills/${AGENT}`);
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  if (step === 'install') {
    const content = readFileSync(join(ROOT, 'skills', 'specguard-enforcer', 'SKILL.md'), 'utf8');
    const existing = await api(`/skills/${AGENT}`).catch(() => []);
    const arr = Array.isArray(existing) ? existing : existing.skills || [];
    const match = arr.find((s) => s.slug === 'specguard-enforcer' || s.name === 'SpecGuard Enforcer');
    if (match) {
      const updated = await api(`/skills/${AGENT}/${match.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'SpecGuard Enforcer',
          description: 'Block-not-recommend pre-trade enforcement under public spec',
          content,
          enabled: true,
        }),
      });
      console.log(JSON.stringify({ action: 'updated', skill: updated }, null, 2));
      return;
    }
    const created = await api(`/skills/${AGENT}`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'SpecGuard Enforcer',
        description: 'Block-not-recommend pre-trade enforcement under public spec',
        content,
        enabled: true,
      }),
    });
    console.log(JSON.stringify({ action: 'created', skill: created }, null, 2));
    return;
  }

  if (step === 'get') {
    const skillId = process.argv[3];
    if (!skillId) throw new Error('skill id required');
    const skill = await api(`/skills/${AGENT}/${skillId}`);
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  if (step === 'account') {
    const result = await api('/perps/account', {
      method: 'POST',
      body: JSON.stringify({ agent_id: AGENT }),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (step === 'chat') {
    const message = process.argv.slice(3).join(' ') || process.argv[3];
    if (!message) throw new Error('message required');
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
        'X-Agent-ID': AGENT,
        'X-Allow-Paid-Fallback': 'true',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
    });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (!res.ok) {
      throw new Error(body.error || body.message || text || res.statusText);
    }
    const reply = body.choices?.[0]?.message?.content || body.content || body.reply || body;
    console.log(JSON.stringify({ ok: true, message, reply }, null, 2));
    return;
  }

  console.error('Usage: node phase7-api.mjs list|install|get <skill_id>|account|chat <message>');
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
  process.exit(1);
});
