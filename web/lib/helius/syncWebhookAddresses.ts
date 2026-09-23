import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRootEnvOnce } from "../loadRootEnv";
function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export async function listAgentWallets(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase.from("agents").select("wallet");
  if (error) throw new Error(`agents list: ${error.message}`);
  return (data ?? []).map((r) => r.wallet).sort();
}

export async function syncHeliusWebhookAddresses(
  supabase: SupabaseClient,
): Promise<{ webhookId: string; addresses: string[] }> {
  loadRootEnvOnce();
  const apiKey = process.env.HELIUS_API_KEY;  const webhookId = process.env.HELIUS_WEBHOOK_ID;
  const authHeader = process.env.HELIUS_WEBHOOK_AUTH_HEADER;
  const baseUrl = process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, "");

  if (!apiKey || !webhookId || !authHeader || !baseUrl) {
    throw new Error(
      "Missing HELIUS_API_KEY, HELIUS_WEBHOOK_ID, HELIUS_WEBHOOK_AUTH_HEADER, or WEBHOOK_PUBLIC_URL",
    );
  }

  const addresses = await listAgentWallets(supabase);
  if (addresses.length === 0) {
    throw new Error("No agents to sync to Helius webhook");
  }

  const webhookURL = `${baseUrl}/api/webhooks/helius`;
  const body = {
    webhookURL,
    webhookType: "enhanced",
    accountAddresses: addresses,
    transactionTypes: ["ANY"],
    authHeader,
  };

  const res = await fetch(
    `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${encodeURIComponent(apiKey)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Helius webhook PUT ${res.status}: ${text}`);
  }

  return { webhookId, addresses };
}

export async function fetchHeliusWebhookAddresses(): Promise<string[]> {
  loadRootEnvOnce();
  const apiKey = process.env.HELIUS_API_KEY;  const webhookId = process.env.HELIUS_WEBHOOK_ID;
  if (!apiKey || !webhookId) {
    throw new Error("Missing HELIUS_API_KEY or HELIUS_WEBHOOK_ID");
  }

  const res = await fetch(
    `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${encodeURIComponent(apiKey)}`,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Helius webhook GET ${res.status}: ${text}`);
  }
  const json = JSON.parse(text) as unknown;
  const rec = asRecord(json);
  const addrs = rec?.accountAddresses;
  if (!Array.isArray(addrs)) return [];
  return addrs.filter((a): a is string => typeof a === "string").sort();
}
