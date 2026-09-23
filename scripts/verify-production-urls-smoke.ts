/**
 * Slice 19: production URL smoke (Registry + Phoenix status.json).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function check(url: string, label: string, opts?: { soft?: boolean }) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    console.log(label, url, res.status);
    if (!res.ok && !opts?.soft) {
      console.error(`FAIL ${label}`);
      process.exit(1);
    }
    if (!res.ok && opts?.soft) {
      console.warn(`WARN ${label} HTTP ${res.status}`);
    }
  } catch (e) {
    if (opts?.soft) {
      console.warn(`WARN ${label}`, e instanceof Error ? e.message : e);
      return;
    }
    throw e;
  }
}

async function main() {
  loadEnv();
  const registry =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.REGISTRY_SMOKE_URL?.replace(/\/$/, "") ??
    "https://web-pi-opal-szwuxtcplv.vercel.app";
  const phoenix =
    process.env.NEXT_PUBLIC_PHOENIX_URL?.replace(/\/$/, "") ??
    "https://specguard.xyz";

  await check(`${registry}/registry`, "registry");
  await check(`${registry}/register`, "register");
  await check(`${registry}/`, "home");
  const badgeWallet =
    process.env.REGISTRY_BADGE_WALLET ??
    "2JJesYGBgDTFkaBGfJG6srKekK2RiVeYAS8ngeT5ZhKS";
  const badgeRes = await fetch(`${registry}/badge/${badgeWallet}`, {
    redirect: "follow",
  });
  console.log("badge", `${registry}/badge/${badgeWallet}`, badgeRes.status);
  if (!badgeRes.ok) {
    console.warn(
      "WARN badge not 200 — redeploy Vercel with Slice 16+ routes or set REGISTRY_BADGE_WALLET",
    );
  }
  await check(`${phoenix}/status.json`, "phoenix-status", { soft: true });
  console.log("PASS slice19 production URL smoke");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
