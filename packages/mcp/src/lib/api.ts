import type { Policy } from "@specguardxyz/core";

export interface AgentSummary {
  wallet: string;
  name: string;
  status: string;
  agentType?: string;
  lastHeartbeatAt?: string | null;
  lastTxAt?: string | null;
  registeredAt?: string | null;
  policy?: Policy | null;
}

export interface VerifyResult {
  status: string;
  breachReasons: string[];
  drawdownPct?: number | null;
  realizedUsdc?: number | null;
}

export class SpecGuardApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "SpecGuardApiError";
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    throw new SpecGuardApiError(
      `Non-JSON response from registry (HTTP ${res.status})`,
      res.status,
    );
  }
}

export class SpecGuardApi {
  constructor(private readonly baseUrl: string) {}

  private async request(
    path: string,
    init?: RequestInit,
  ): Promise<Record<string, unknown>> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Accept: "application/json", ...init?.headers },
      });
    } catch (e) {
      throw new SpecGuardApiError(
        `Cannot reach the SpecGuard registry at ${this.baseUrl}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
    const body = await readJson(res);
    if (!res.ok || body.ok === false) {
      const detail = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      throw new SpecGuardApiError(detail, res.status);
    }
    return body;
  }

  async getAgent(wallet: string): Promise<Record<string, unknown>> {
    return this.request(`/api/agents/${encodeURIComponent(wallet)}`);
  }

  async listAgents(): Promise<Record<string, unknown>> {
    return this.request("/api/agents");
  }

  async verifyAgent(wallet: string): Promise<Record<string, unknown>> {
    return this.request(`/api/agents/${encodeURIComponent(wallet)}/verify`, {
      method: "POST",
    });
  }

  async getHistory(wallet: string): Promise<Record<string, unknown>> {
    return this.request(
      `/api/agents/${encodeURIComponent(wallet)}/history?limit=100`,
    );
  }

  /** Asks the registry to index a heartbeat or action memo already confirmed onchain. */
  async reportMemo(
    wallet: string,
    signature: string,
  ): Promise<Record<string, unknown>> {
    return this.request(`/api/agents/${encodeURIComponent(wallet)}/memo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature }),
    });
  }

  async prepareRegistration(payload: {
    wallet: string;
    policy: Policy;
  }): Promise<Record<string, unknown>> {
    return this.request("/api/register/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
