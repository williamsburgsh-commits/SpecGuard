import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_PATH = join(ROOT, 'site', 'status.json');
const HEARTBEAT_DIR = join(ROOT, 'logs', 'heartbeat');

function loadStatus() {
  return JSON.parse(readFileSync(STATUS_PATH, 'utf8'));
}

function saveStatus(status) {
  writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + '\n');
}

function isoSafe(now) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function main() {
  const now = new Date();
  const at = now.toISOString();
  const proofRef = `logs/heartbeat/heartbeat-${isoSafe(now)}.json`;
  const proofPayload = {
    at,
    proof_type: 'repo_log',
    proof_ref: proofRef,
    memo: `specguard-hb-${Math.floor(now.getTime() / 1000)}`,
    content_hash: createHash('sha256').update(at).digest('hex'),
  };

  if (!existsSync(HEARTBEAT_DIR)) mkdirSync(HEARTBEAT_DIR, { recursive: true });
  writeFileSync(join(ROOT, proofRef), JSON.stringify(proofPayload, null, 2) + '\n');

  const status = loadStatus();
  status.last_heartbeat_at = at;
  status.last_heartbeat_proof = proofRef;
  status.copy_trade_eligible = status.status === 'GREEN';
  saveStatus(status);

  console.log(JSON.stringify({
    ok: true,
    at,
    proof_ref: proofRef,
    copy_trade_eligible: status.copy_trade_eligible,
    status_path: 'site/status.json',
  }, null, 2));
}

main();
