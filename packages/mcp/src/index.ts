#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./lib/config.js";
import { registerTools } from "./tools.js";

export { loadConfig } from "./lib/config.js";
export { registerTools } from "./tools.js";
export { SpecGuardApi, SpecGuardApiError } from "./lib/api.js";
export { parseKeypair, sendMemo, buildUnsignedMemoTx } from "./lib/rpc.js";

export function createServer(config = loadConfig()): McpServer {
  const server = new McpServer({
    name: "specguard",
    version: "0.1.0",
  });
  registerTools(server, config);
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run the server when invoked directly, so the module stays importable.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e: unknown) => {
    console.error("[specguard-mcp] fatal:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
