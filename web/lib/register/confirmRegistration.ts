import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canonicalPolicyJson,
  decodeMemo,
  type PolicyV1,
} from "@specguard/core";
import { getGuardBalanceForWallet } from "../guard/balance";
import { syncHeliusWebhookAddresses } from "../helius/syncWebhookAddresses";
import { verifyPolicyMemoTransaction } from "./verifyPolicyTx";
import { buildEmbedHtml } from "./embedHtml";

export interface ConfirmRegistrationInput {
  /** Watched trading wallet stored in the registry. */
  wallet: string;
  signature: string;
  policyHash: string;
  /** Wallet that holds $GUARD and signs the policy memo. Defaults to `wallet`. */
  guardWallet?: string;
}

export interface ConfirmRegistrationResult {
  agent: {
    wallet: string;
    name: string;
    status: string;
    registrationSig: string;
  };
  policyId: string;
  embedHtml: string;
  webhookAddresses: string[];
  webhookSyncWarning?: string;
}

export async function confirmRegistration(
  supabase: SupabaseClient,
  input: ConfirmRegistrationInput,
): Promise<ConfirmRegistrationResult> {
  const wallet = input.wallet.trim();
  const guardWallet = (input.guardWallet ?? input.wallet).trim();
  const signature = input.signature.trim();
  const policyHash = input.policyHash.trim().toLowerCase();

  const guard = await getGuardBalanceForWallet(guardWallet);
  if (!guard.meetsMinimum) {
    throw new Error("$GUARD balance below minimum for registration");
  }

  const verified = await verifyPolicyMemoTransaction(
    signature,
    wallet,
    policyHash,
    guardWallet,
  );

  const decoded = decodeMemo(verified.memoText);
  if (decoded?.kind !== "policy") {
    throw new Error("Invalid policy memo");
  }
  const policy: PolicyV1 = decoded.policy;

  const { data: existingAgent } = await supabase
    .from("agents")
    .select("wallet, registration_sig")
    .eq("wallet", wallet)
    .maybeSingle();

  if (existingAgent?.registration_sig) {
    throw new Error("Wallet already registered");
  }

  const { data: existingPolicy } = await supabase
    .from("policies")
    .select("id")
    .eq("memo_sig", signature)
    .maybeSingle();

  if (existingPolicy?.id) {
    throw new Error("Policy memo already registered");
  }

  const { count: versionCount } = await supabase
    .from("policies")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet);

  const version = (versionCount ?? 0) + 1;
  const guardBalanceNum = Number(guard.balanceRaw) / 10 ** guard.decimals;
  const registeredAt = verified.blocktime.toISOString();

  const { error: agentStubErr } = await supabase.from("agents").upsert(
    {
      wallet,
      name: policy.name,
      is_specguard: false,
      registered_at: registeredAt,
      registration_sig: signature,
      status: "GREEN",
      status_since: registeredAt,
      guard_balance_at_registration: guardBalanceNum,
      last_tx_at: registeredAt,
      last_tx_sig: signature,
    },
    { onConflict: "wallet" },
  );

  if (agentStubErr) {
    throw new Error(`agents upsert: ${agentStubErr.message}`);
  }

  const { data: policyRow, error: policyErr } = await supabase
    .from("policies")
    .insert({
      wallet,
      version,
      memo_sig: signature,
      blocktime: verified.blocktime.toISOString(),
      name: policy.name,
      max_drawdown_pct: policy.maxDrawdownPct,
      max_spend_per_tx_sol: policy.maxSpendPerTxSol,
      allowed_venues: policy.allowedVenues,
      heartbeat_interval_sec: policy.heartbeatIntervalSec,
      raw_json: JSON.parse(canonicalPolicyJson(policy)),
      policy_hash: verified.policyHash,
    })
    .select("id")
    .single();

  if (policyErr || !policyRow) {
    throw new Error(`policies insert: ${policyErr?.message ?? "unknown"}`);
  }

  const { error: agentLinkErr } = await supabase
    .from("agents")
    .update({ current_policy_id: policyRow.id })
    .eq("wallet", wallet);

  if (agentLinkErr) {
    throw new Error(`agents update: ${agentLinkErr.message}`);
  }

  await supabase.from("status_events").insert({
    wallet,
    from_status: "GREEN",
    to_status: "GREEN",
    reason: "registered",
    proof_sig: signature,
    detail: {
      policyHash: verified.policyHash,
      guardBalanceRaw: guard.balanceRaw,
    },
    occurred_at: verified.blocktime.toISOString(),
  });

  let webhookAddresses: string[] = [];
  let webhookSyncWarning: string | undefined;
  try {
    const synced = await syncHeliusWebhookAddresses(supabase);
    webhookAddresses = synced.addresses;
  } catch (e) {
    webhookSyncWarning =
      e instanceof Error ? e.message : "Helius webhook sync failed";
  }

  return {
    agent: {
      wallet,
      name: policy.name,
      status: "GREEN",
      registrationSig: signature,
    },
    policyId: policyRow.id,
    embedHtml: buildEmbedHtml(wallet),
    webhookAddresses,
    ...(webhookSyncWarning ? { webhookSyncWarning } : {}),
  };
}
