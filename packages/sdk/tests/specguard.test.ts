import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { Keypair } from "@solana/web3.js";
import { SpecGuard, SpecGuardError, keypairFromSecret } from "../src/index.js";
import bs58 from "bs58";

const socialPolicy = {
  version: 2,
  name: "social-agent",
  type: "social",
  heartbeatIntervalSec: 600,
  spendLimits: { perTxSol: 0.1, dailySol: 1 },
  socialLimits: { maxPostsPerDay: 20, allowDMs: false, platforms: ["x"] },
};

const traderPolicy = {
  version: 1,
  name: "trader-agent",
  maxDrawdownPct: 10,
  maxSpendPerTxSol: 0.5,
  allowedVenues: ["jupiter-swap"],
  heartbeatIntervalSec: 300,
};

const REGISTERED = "So1Agent111111111111111111111111111111111";
const TRADER = "So1Trader11111111111111111111111111111111";
const UNREGISTERED = "So1Nobody11111111111111111111111111111111";

/** Stands in for the registry so the SDK's real fetch path is exercised. */
let server: Server;
let apiUrl: string;
let verifyCalls = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const json = (status: number, body: unknown): void => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    const agentMatch = url.pathname.match(/^\/api\/agents\/([^/]+)$/);
    if (agentMatch && req.method === "GET") {
      const wallet = decodeURIComponent(agentMatch[1]);
      if (wallet === REGISTERED) {
        return json(200, {
          ok: true,
          agent: {
            wallet,
            name: "social-agent",
            agentType: "social",
            status: "GREEN",
            lastHeartbeatAt: "2026-09-27T12:00:00.000Z",
            policy: { name: "social-agent", raw: socialPolicy },
          },
        });
      }
      if (wallet === TRADER) {
        return json(200, {
          ok: true,
          agent: {
            wallet,
            name: "trader-agent",
            agentType: "trader",
            status: "RED",
            lastHeartbeatAt: null,
            policy: { name: "trader-agent", raw: traderPolicy },
          },
        });
      }
      return json(404, { ok: false, error: "not found" });
    }

    const verifyMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/verify$/);
    if (verifyMatch && req.method === "POST") {
      verifyCalls += 1;
      return json(200, { ok: true, status: "GREEN", breachReasons: [] });
    }

    if (url.pathname === "/api/agents" && req.method === "GET") {
      return json(200, { ok: true, agents: [{ wallet: REGISTERED }], count: 1 });
    }

    if (url.pathname === "/api/broken") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end("not json at all");
    }

    return json(404, { ok: false, error: "no route" });
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  if (addr == null || typeof addr === "string") throw new Error("no port");
  apiUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

function readOnly(wallet: string): SpecGuard {
  return new SpecGuard({ wallet, apiUrl });
}

describe("construction", () => {
  it("accepts a wallet address alone", () => {
    expect(readOnly(REGISTERED).wallet).toBe(REGISTERED);
  });

  it("derives the wallet from a keypair", () => {
    const kp = Keypair.generate();
    const guard = new SpecGuard({ keypair: kp, apiUrl });
    expect(guard.wallet).toBe(kp.publicKey.toBase58());
  });

  it("rejects neither keypair nor wallet", () => {
    expect(() => new SpecGuard({ apiUrl })).toThrow(SpecGuardError);
  });

  it("builds from a base58 secret key", () => {
    const kp = Keypair.generate();
    const guard = SpecGuard.fromSecretKey(bs58.encode(kp.secretKey), { apiUrl });
    expect(guard.wallet).toBe(kp.publicKey.toBase58());
  });

  it("builds from a JSON byte-array secret key", () => {
    const kp = Keypair.generate();
    const guard = SpecGuard.fromSecretKey(JSON.stringify([...kp.secretKey]), { apiUrl });
    expect(guard.wallet).toBe(kp.publicKey.toBase58());
  });

  it("rejects a malformed secret key", () => {
    expect(() => keypairFromSecret("nope")).toThrow();
    expect(() => keypairFromSecret("")).toThrow();
    expect(() => keypairFromSecret("[1,2,3]")).toThrow();
  });
});

describe("signing guards", () => {
  it("refuses to register without a keypair", async () => {
    await expect(readOnly(REGISTERED).register(socialPolicy)).rejects.toThrow(
      /needs a keypair/,
    );
  });

  it("refuses to heartbeat without a keypair", async () => {
    await expect(readOnly(REGISTERED).heartbeat()).rejects.toThrow(/needs a keypair/);
  });

  it("refuses to log an action without a keypair", async () => {
    await expect(
      readOnly(REGISTERED).logAction({ type: "social_post" }),
    ).rejects.toThrow(/needs a keypair/);
  });
});

describe("policy validation", () => {
  const guard = () => new SpecGuard({ keypair: Keypair.generate(), apiUrl });

  it("rejects a V2 policy missing spendLimits", async () => {
    await expect(
      guard().register({ version: 2, name: "x", type: "social", heartbeatIntervalSec: 300 }),
    ).rejects.toThrow(/Invalid policy/);
  });

  it("rejects an unknown agent type", async () => {
    await expect(
      guard().register({ ...socialPolicy, type: "wizard" }),
    ).rejects.toThrow(/Invalid policy/);
  });

  it("rejects a sub-60s heartbeat", async () => {
    await expect(
      guard().register({ ...socialPolicy, heartbeatIntervalSec: 10 }),
    ).rejects.toThrow(/Invalid policy/);
  });

  it("rejects a non-object policy", async () => {
    await expect(guard().register("hello")).rejects.toThrow(/Invalid policy/);
  });
});

describe("status", () => {
  it("reads a GREEN agent and parses its V2 policy", async () => {
    const s = await readOnly(REGISTERED).status();
    expect(s.status).toBe("GREEN");
    expect(s.name).toBe("social-agent");
    expect(s.agentType).toBe("social");
    expect(s.policy?.version).toBe(2);
    expect(s.lastHeartbeatAt).toBe("2026-09-27T12:00:00.000Z");
  });

  it("reads a RED agent and parses its V1 policy", async () => {
    const s = await readOnly(TRADER).status();
    expect(s.status).toBe("RED");
    expect(s.policy?.version).toBe(1);
  });

  it("throws a clear error for an unregistered wallet", async () => {
    await expect(readOnly(UNREGISTERED).status()).rejects.toThrow(/not found/);
  });

  it("reads another agent's status", async () => {
    const body = await readOnly(UNREGISTERED).statusOf(REGISTERED);
    expect((body.agent as Record<string, unknown>).status).toBe("GREEN");
  });

  it("surfaces an unreachable registry", async () => {
    const guard = new SpecGuard({
      wallet: REGISTERED,
      apiUrl: "http://127.0.0.1:1",
    });
    await expect(guard.status()).rejects.toThrow(/Cannot reach/);
  });
});

describe("policy caching", () => {
  it("returns the registered policy", async () => {
    const policy = await readOnly(REGISTERED).policy();
    expect(policy?.name).toBe("social-agent");
  });

  it("returns null-safe behavior for an unknown agent", async () => {
    await expect(readOnly(UNREGISTERED).policy()).rejects.toThrow(/not found/);
  });
});

describe("preCheck — social agent", () => {
  const guard = () => readOnly(REGISTERED);

  it("allows an in-policy post", async () => {
    const r = await guard().preCheck({ type: "social_post", platform: "x" });
    expect(r.allowed).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("blocks a DM when DMs are disallowed", async () => {
    const r = await guard().preCheck({ type: "social_dm", platform: "x" });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain("social_limit_exceeded");
  });

  it("blocks an off-policy platform", async () => {
    const r = await guard().preCheck({ type: "social_post", platform: "telegram" });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain("social_limit_exceeded");
  });

  it("blocks a spend over the per-tx cap", async () => {
    const r = await guard().preCheck({ spendSol: 0.5 });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain("max_spend_per_tx");
  });

  it("allows a spend under the per-tx cap", async () => {
    const r = await guard().preCheck({ spendSol: 0.05 });
    expect(r.allowed).toBe(true);
  });

  it("ignores venues when the policy sets none", async () => {
    const r = await guard().preCheck({
      spendSol: 0.01,
      programIds: ["Drift1111111111111111111111111111111111111"],
    });
    expect(r.allowed).toBe(true);
  });
});

describe("preCheck — trader agent", () => {
  it("blocks a disallowed venue", async () => {
    const r = await readOnly(TRADER).preCheck({
      spendSol: 0.1,
      programIds: ["Drift1111111111111111111111111111111111111"],
    });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain("disallowed_venue");
  });

  it("allows an in-policy venue", async () => {
    const r = await readOnly(TRADER).preCheck({
      spendSol: 0.1,
      programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
    });
    expect(r.allowed).toBe(true);
  });

  it("blocks a spend over the V1 cap", async () => {
    const r = await readOnly(TRADER).preCheck({ spendSol: 1 });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain("max_spend_per_tx");
  });
});

describe("preCheck — unregistered", () => {
  it("throws rather than silently allowing", async () => {
    await expect(
      readOnly(UNREGISTERED).preCheck({ type: "social_post" }),
    ).rejects.toThrow(/not found/);
  });
});

describe("verify", () => {
  it("posts to the registry verify endpoint", async () => {
    const before = verifyCalls;
    const body = await readOnly(REGISTERED).verify();
    expect(verifyCalls).toBe(before + 1);
    expect(body.status).toBe("GREEN");
  });
});

describe("heartbeat timer", () => {
  it("stopHeartbeat is safe when never started", () => {
    expect(() => readOnly(REGISTERED).stopHeartbeat()).not.toThrow();
  });

  it("startHeartbeat requires a keypair", async () => {
    await expect(readOnly(REGISTERED).startHeartbeat()).rejects.toThrow(
      /needs a keypair/,
    );
  });
});
