/**
 * Slice 5 DoD: one Jupiter Trigger limit order on mainnet, list open, cancel.
 *
 * Default: USDC→SOL bid (needs ≥5 USDC). Use --side ask for SOL→USDC (needs ~0.05 SOL).
 * Pass --dry-run to only print params (no chain txs).
 */
import { loadRepoEnv } from "../src/loadEnv.js";
import { createMainnetAgentClient } from "../src/client.js";
import {
  cancelTriggerOrder,
  createAskOrder,
  createBidOrder,
  defaultTinyAskParams,
  defaultTinyBidParams,
  fetchSolUsdcMidPrice,
  listActiveTriggerOrders,
  signAndExecuteCancel,
  signAndExecuteTriggerOrder,
  TRIGGER_MIN_NOTIONAL_USDC,
} from "../src/jupiter/trigger.js";
import {
  FEE_RESERVE_LAMPORTS,
  formatFundingHint,
  getSolBalanceLamports,
  getUsdcBalanceRaw,
} from "../src/jupiter/preflight.js";

loadRepoEnv();

const dryRun = process.argv.includes("--dry-run");
const side: "bid" | "ask" =
  process.argv.find((a) => a.startsWith("--side="))?.split("=")[1] === "ask"
    ? "ask"
    : "bid";

async function main() {
  const { client } = await createMainnetAgentClient();
  const wallet = client.payer.address;

  const mid = await fetchSolUsdcMidPrice();
  const [solBal, usdcBal] = await Promise.all([
    getSolBalanceLamports(client.rpc, wallet),
    getUsdcBalanceRaw(client.rpc, wallet),
  ]);

  console.log(`SOL mid ~$${mid.toFixed(2)}`);
  console.log(
    `Wallet SOL: ${(Number(solBal) / 1e9).toFixed(6)} | USDC: ${(Number(usdcBal) / 1e6).toFixed(2)}`,
  );
  console.log(`Jupiter min notional ~$${TRIGGER_MIN_NOTIONAL_USDC}`);

  let effectiveSide: "bid" | "ask" = side;
  if (
    side === "bid" &&
    usdcBal < BigInt(TRIGGER_MIN_NOTIONAL_USDC * 1_000_000)
  ) {
    console.log(
      "No USDC for bid — auto-switching to --side ask (fund USDC for a bid demo).",
    );
    effectiveSide = "ask";
  }

  const hint = formatFundingHint({
    side: effectiveSide,
    midUsdPerSol: mid,
    solLamports: solBal,
    usdcRaw: usdcBal,
  });
  if (hint) {
    console.error(hint);
    process.exit(1);
  }

  const createdParams =
    effectiveSide === "bid"
      ? (() => {
          const bid = defaultTinyBidParams(mid);
          console.log(
            `Bid: offer ${Number(bid.makingUsdcRaw) / 1e6} USDC for ${Number(bid.takingSolRaw) / 1e9} SOL (~50% spot)`,
          );
          return { kind: "bid" as const, bid };
        })()
      : (() => {
          const ask = defaultTinyAskParams(mid);
          console.log(
            `Ask: offer ${Number(ask.makingSolRaw) / 1e9} SOL for ${Number(ask.takingUsdcRaw) / 1e6} USDC (~2× spot)`,
          );
          return { kind: "ask" as const, ask };
        })();

  if (dryRun) {
    console.log("--dry-run: skipping create/list/cancel");
    return;
  }

  const askNeedSol =
    createdParams.kind === "ask"
      ? createdParams.ask.makingSolRaw + FEE_RESERVE_LAMPORTS
      : 0n;
  if (effectiveSide === "ask" && solBal < askNeedSol) {
    console.error("Insufficient SOL for ask + fee reserve.");
    process.exit(1);
  }

  console.log("\n1) createOrder + execute…");
  const created =
    createdParams.kind === "bid"
      ? await createBidOrder(wallet, createdParams.bid)
      : await createAskOrder(wallet, createdParams.ask);
  console.log("   orderKey:", created.order);
  const createExec = await signAndExecuteTriggerOrder(client.payer, created);
  if (createExec.status !== "Success") {
    throw new Error(`Create execute failed: ${JSON.stringify(createExec)}`);
  }
  console.log("   create sig:", createExec.signature);
  console.log(`   https://solscan.io/tx/${createExec.signature}`);

  console.log("\n2) getTriggerOrders (active)…");
  const open = await listActiveTriggerOrders(wallet);
  const found = open.find((o) => o.orderKey === created.order);
  console.log(
    `   active orders: ${open.length}`,
    found ? "(includes new order)" : "(order not listed yet)",
  );

  console.log("\n3) cancelOrder + execute…");
  const cancel = await cancelTriggerOrder(wallet, created.order);
  const cancelExec = await signAndExecuteCancel(client.payer, cancel);
  if (cancelExec.status !== "Success") {
    throw new Error(`Cancel execute failed: ${JSON.stringify(cancelExec)}`);
  }
  console.log("   cancel sig:", cancelExec.signature);
  console.log(`   https://solscan.io/tx/${cancelExec.signature}`);

  console.log("\n4) getTriggerOrders (active) after cancel…");
  const openAfter = await listActiveTriggerOrders(wallet);
  const stillOpen = openAfter.some((o) => o.orderKey === created.order);
  console.log(`   still open: ${stillOpen}`);
  console.log("\nSlice 5 demo complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
