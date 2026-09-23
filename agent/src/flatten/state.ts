import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { repoRootPath } from "../loadEnv.js";

export type AgentRuntimeStatus = "GREEN" | "RED";

export interface AgentLocalState {
  status: AgentRuntimeStatus;
  flattenProofSig?: string;
  flattenReason?: string;
  stoppedAt?: string;
}

const STATE_DIR = resolve(repoRootPath(), "agent/state");
const STATE_FILE = resolve(STATE_DIR, "agent-runtime.json");

export function loadAgentLocalState(): AgentLocalState {
  if (!existsSync(STATE_FILE)) {
    return { status: "GREEN" };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as AgentLocalState;
  } catch {
    return { status: "GREEN" };
  }
}

export function saveAgentLocalState(state: AgentLocalState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function assertQuotingAllowed(): void {
  const state = loadAgentLocalState();
  if (state.status === "RED") {
    throw new Error(
      `Agent is RED (flatten ${state.flattenProofSig ?? "unknown"}). Quoting stopped.`,
    );
  }
}
