import { runOperatorCycle } from './operator-cycle.mjs';

async function main() {
  const result = await runOperatorCycle({
    operatorName: process.env.SPECGUARD_OPERATOR || 'github_actions',
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.quote_error && !result.quote) process.exitCode = 1;
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exit(1);
});
