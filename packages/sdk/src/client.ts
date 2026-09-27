import { SpecGuardError } from "./types.js";

/** Thin JSON client for the SpecGuard registry API. */
export class RegistryClient {
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
      throw new SpecGuardError(
        `Cannot reach the SpecGuard registry at ${this.baseUrl}`,
        e,
      );
    }

    const text = await res.text();
    let body: Record<string, unknown> = {};
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          body = parsed as Record<string, unknown>;
        }
      } catch {
        throw new SpecGuardError(
          `Registry returned non-JSON (HTTP ${res.status}) from ${path}`,
        );
      }
    }

    if (!res.ok || body.ok === false) {
      const detail =
        typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      throw new SpecGuardError(detail);
    }
    return body;
  }

  getAgent(wallet: string): Promise<Record<string, unknown>> {
    return this.request(`/api/agents/${encodeURIComponent(wallet)}`);
  }

  listAgents(): Promise<Record<string, unknown>> {
    return this.request("/api/agents");
  }

  verifyAgent(wallet: string): Promise<Record<string, unknown>> {
    return this.request(`/api/agents/${encodeURIComponent(wallet)}/verify`, {
      method: "POST",
    });
  }

  confirmRegistration(payload: {
    wallet: string;
    signature: string;
    policyHash: string;
  }): Promise<Record<string, unknown>> {
    return this.request("/api/register/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
