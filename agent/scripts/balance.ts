import { loadRepoEnv } from "../src/loadEnv.js";
import { getWalletBalanceSol } from "../src/publishPolicy.js";

loadRepoEnv();

const { wallet, sol } = await getWalletBalanceSol();
console.log(`Wallet: ${wallet}`);
console.log(`Balance: ${sol.toFixed(6)} SOL (mainnet)`);
