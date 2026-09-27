/**
 * Drives the SpecGuard MCP server over real stdio transport and asserts each
 * tool behaves. Network-dependent checks are reported but do not fail the run,
 * so the suite stays useful offline.
 *
 *   npm run test:mcp
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../packages/mcp/dist/index.js");

const EXPECTED_TOOLS = [
  "specguard_register",
  "specguard_heartbeat",
  "specguard_log_action",
  "specguard_precheck",
  "specguard_status",
  "specguard_verify",
  "specguard_list_agents",
];

let failures = 0;
let warnings = 0;

function pass(name: string, detail = ""): void {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string): void {
  failures += 1;
  console.error(`  FAIL  ${name} — ${detail}`);
}

function warn(name: string, detail: string): void {
  warnings += 1;
  console.warn(`  WARN  ${name} — ${detail}`);
}

function textOf(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] }).content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

function jsonOf(result: unknown): Record<string, unknown> {
  const text = textOf(result);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}

async function main(): Promise<void> {
  console.log("SpecGuard MCP smoke test");
  console.log(`  server: ${serverEntry}\n`);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    env: { ...process.env, SPECGUARD_API_URL: "https://specguard.xyz" } as Record<
      string,
      string
    >,
  });

  const client = new Client({ name: "specguard-smoke", version: "0.1.0" });
  await client.connect(transport);
  console.log("connected over stdio\n");

  // ---- tool discovery ----
  console.log("tool discovery");
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  for (const expected of EXPECTED_TOOLS) {
    if (names.includes(expected)) pass(`exposes ${expected}`);
    else fail(`exposes ${expected}`, `missing (got: ${names.join(", ")})`);
  }
  if (names.length === EXPECTED_TOOLS.length) {
    pass("no unexpected tools", `${names.length} total`);
  } else {
    fail("no unexpected tools", `expected ${EXPECTED_TOOLS.length}, got ${names.length}`);
  }
  for (const t of tools) {
    if (t.description && t.description.length > 20) continue;
    fail(`${t.name} has a usable description`, "missing or too short");
  }

  // ---- policy validation (no network) ----
  console.log("\npolicy validation");
  const badPolicy = await client.callTool({
    name: "specguard_register",
    arguments: {
      wallet: "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk",
      policy: { version: 2, name: "broken", type: "social" },
    },
  });
  const badBody = jsonOf(badPolicy);
  if (isError(badPolicy) && String(badBody.error ?? "").includes("Invalid policy")) {
    pass("rejects a V2 policy missing spendLimits", String(badBody.error).slice(0, 70));
  } else {
    fail("rejects a V2 policy missing spendLimits", `got ${textOf(badPolicy).slice(0, 120)}`);
  }

  const badType = await client.callTool({
    name: "specguard_register",
    arguments: {
      wallet: "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk",
      policy: {
        version: 2,
        name: "wizard-agent",
        type: "wizard",
        heartbeatIntervalSec: 300,
        spendLimits: { perTxSol: 1 },
      },
    },
  });
  if (isError(badType)) pass("rejects an unknown agent type");
  else fail("rejects an unknown agent type", textOf(badType).slice(0, 120));

  const shortHeartbeat = await client.callTool({
    name: "specguard_register",
    arguments: {
      wallet: "2rjFWZzDUqcD2ZvD5MgxmKuNQdz56ap8oR9zKPExdnJk",
      policy: {
        version: 2,
        name: "fast-agent",
        type: "general",
        heartbeatIntervalSec: 5,
        spendLimits: { perTxSol: 1 },
      },
    },
  });
  if (isError(shortHeartbeat)) pass("rejects a sub-60s heartbeat interval");
  else fail("rejects a sub-60s heartbeat interval", textOf(shortHeartbeat).slice(0, 120));

  // ---- keypair handling (no network) ----
  console.log("\nkeypair handling");
  const badKey = await client.callTool({
    name: "specguard_heartbeat",
    arguments: { keypair: "not-a-real-key" },
  });
  if (isError(badKey)) {
    pass("rejects a malformed keypair", String(jsonOf(badKey).error).slice(0, 60));
  } else {
    fail("rejects a malformed keypair", textOf(badKey).slice(0, 120));
  }

  // ---- registry reads (network) ----
  console.log("\nregistry reads (live network)");
  const list = await client.callTool({
    name: "specguard_list_agents",
    arguments: {},
  });
  const listBody = jsonOf(list);
  if (!isError(list) && listBody.ok === true && Array.isArray(listBody.agents)) {
    pass("specguard_list_agents reaches the registry", `${(listBody.agents as unknown[]).length} agents`);
  } else if (isError(list)) {
    warn("specguard_list_agents", `registry unreachable: ${String(listBody.error).slice(0, 80)}`);
  } else {
    fail("specguard_list_agents", `unexpected shape: ${textOf(list).slice(0, 120)}`);
  }

  const missing = await client.callTool({
    name: "specguard_status",
    arguments: { wallet: "11111111111111111111111111111112" },
  });
  const missingBody = jsonOf(missing);
  if (isError(missing) && String(missingBody.error ?? "").length > 0) {
    pass("specguard_status errors cleanly on an unregistered wallet", String(missingBody.error).slice(0, 50));
  } else if (!isError(missing)) {
    warn("specguard_status on unregistered wallet", "expected an error result");
  }

  const precheck = await client.callTool({
    name: "specguard_precheck",
    arguments: {
      wallet: "11111111111111111111111111111112",
      action: { type: "social_post", platform: "x" },
    },
  });
  if (isError(precheck)) {
    pass("specguard_precheck errors cleanly for an unregistered agent", String(jsonOf(precheck).error).slice(0, 50));
  } else {
    fail("specguard_precheck on unregistered agent", "expected an error result");
  }

  await client.close();

  console.log(`\n${failures === 0 ? "OK" : "FAILED"} — ${failures} failure(s), ${warnings} warning(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error("smoke test crashed:", e instanceof Error ? e.stack : e);
  process.exit(1);
});
