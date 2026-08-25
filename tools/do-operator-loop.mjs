import { runOperatorCycle } from './operator-cycle.mjs';
import { pushStatusToGit } from './push-status.mjs';

const INTERVAL_MS = Number(process.env.SPECGUARD_QUOTE_INTERVAL_MS ?? 5 * 60 * 1000);
const OPERATOR = process.env.SPECGUARD_OPERATOR || 'digitalocean';

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce() {
  const result = await runOperatorCycle({ operatorName: OPERATOR });
  console.log(JSON.stringify({ loop: true, ...result }, null, 2));

  let pushResult = null;
  try {
    pushResult = pushStatusToGit();
    console.log(JSON.stringify({ git_push: pushResult }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ git_push_error: err.message }, null, 2));
  }

  return { result, pushResult };
}

async function main() {
  const once = process.argv.includes('--once');
  if (once) {
    await runOnce();
    return;
  }

  console.log(JSON.stringify({
    started: true,
    operator: OPERATOR,
    interval_ms: INTERVAL_MS,
    git_push: process.env.SPECGUARD_GIT_PUSH === '1' || process.env.SPECGUARD_GIT_PUSH === 'true',
  }, null, 2));

  for (;;) {
    try {
      await runOnce();
    } catch (err) {
      console.error(JSON.stringify({ loop_error: err.message }, null, 2));
    }
    await sleep(INTERVAL_MS);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
