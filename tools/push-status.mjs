import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function pushStatusToGit({ message } = {}) {
  if (process.env.SPECGUARD_GIT_PUSH !== '1' && process.env.SPECGUARD_GIT_PUSH !== 'true') {
    return { pushed: false, reason: 'SPECGUARD_GIT_PUSH not enabled' };
  }

  const token = process.env.GITHUB_TOKEN || process.env.SPECGUARD_GITHUB_TOKEN;
  const remote = process.env.SPECGUARD_GIT_REMOTE || 'origin';
  const branch = process.env.SPECGUARD_GIT_BRANCH || 'main';

  if (token) {
    const repoUrl = process.env.SPECGUARD_GIT_URL
      || 'https://github.com/williamsburgsh-commits/SpecGuard.git';
    const authed = repoUrl.replace('https://', `https://x-access-token:${token}@`);
    run(`git remote set-url ${remote} "${authed}"`);
  }

  run('git config user.name "specguard-operator"');
  run('git config user.email "operator@users.noreply.github.com"');

  const paths = [
    'site/status.json',
    'docs/status.json',
    'logs/heartbeat/*.json',
    'logs/phase11-fill-snapshot.json',
  ];
  for (const p of paths) {
    try { run(`git add ${p}`); } catch { /* optional files */ }
  }

  const diff = run('git diff --staged --name-only');
  const commitMsg = message || `operator: heartbeat + quote ${new Date().toISOString().slice(0, 16)}Z`;
  if (diff) {
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  }

  try {
    run(`git pull --rebase --autostash ${remote} ${branch}`);
  } catch {
    run(`git pull --rebase ${remote} ${branch}`);
  }

  if (!diff) return { pushed: false, reason: 'no changes' };

  run(`git push ${remote} ${branch}`);

  return { pushed: true, commit: commitMsg, files: diff.split('\n') };
}

async function main() {
  if (!existsSync(join(ROOT, '.git'))) {
    console.error(JSON.stringify({ error: 'not a git repo' }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(pushStatusToGit(), null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
