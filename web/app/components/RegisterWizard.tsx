"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletConnect } from "@/app/components/chrome/WalletConnect";
import type { PolicyV1 } from "@specguard/core";
import { GuardBalanceGate, type GuardBalancePayload } from "./GuardBalanceGate";
import { sendPolicyMemoTransaction } from "@/lib/register/sendPolicyMemo";
import { walletAdapterToProvider } from "@/lib/wallet/walletAdapterProvider";
import { cn } from "@/lib/utils";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";
import { PolicyCard } from "@/components/ui/PolicyCard";
import { BadgeEmbed } from "@/components/ui/BadgeEmbed";
import { StatusBadge } from "@/components/ui/StatusBadge";

const DEFAULT_POLICY: PolicyV1 = {
  version: 1,
  name: "My SpecGuard Agent",
  maxDrawdownPct: 10,
  maxSpendPerTxSol: 0.5,
  allowedVenues: ["jupiter-swap", "jupiter-trigger"],
  heartbeatIntervalSec: 300,
};

type Step = "connect" | "guard" | "policy" | "sign" | "done";
const STEPS: Step[] = ["connect", "guard", "policy", "sign", "done"];
const VENUE_OPTIONS: { id: PolicyV1["allowedVenues"][number]; label: string }[] = [
  { id: "jupiter-swap", label: "Jupiter" },
  { id: "jupiter-trigger", label: "Jupiter Trigger" },
  { id: "spl-token", label: "Other" },
];
const HEARTBEATS = [
  { sec: 60, label: "1min" },
  { sec: 300, label: "5min" },
  { sec: 900, label: "15min" },
];

export function RegisterWizard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected, publicKey, disconnect, wallet: walletAdapter } = wallet;
  const address = publicKey?.toBase58() ?? null;
  const walletName = walletAdapter?.adapter.name ?? null;
  const provider = useMemo(
    () => walletAdapterToProvider(wallet, connection),
    [wallet, connection],
  );

  const [step, setStep] = useState<Step>(connected ? "guard" : "connect");
  const [useDifferentWallet, setUseDifferentWallet] = useState(false);
  const [watchedWallet, setWatchedWallet] = useState("");
  const [gate, setGate] = useState<GuardBalancePayload | null>(null);
  const [policy, setPolicy] = useState<PolicyV1>(DEFAULT_POLICY);
  const [prepare, setPrepare] = useState<{ memoText: string; policyHash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    signature: string;
    embedHtml: string;
    webhookSyncWarning?: string;
  } | null>(null);

  useEffect(() => {
    if (connected && address) {
      setStep((s) => (s === "connect" ? "guard" : s));
    }
  }, [connected, address]);

  const canContinueGuard = gate?.meetsMinimum === true;
  const stepIndex = STEPS.indexOf(step);
  const agentWallet = (useDifferentWallet ? watchedWallet.trim() : address) ?? "";
  const agentWalletValid = isLikelySolanaAddress(agentWallet);

  const toggleVenue = (id: PolicyV1["allowedVenues"][number]) => {
    setPolicy((p) => {
      const has = p.allowedVenues.includes(id);
      return {
        ...p,
        allowedVenues: has
          ? p.allowedVenues.filter((v) => v !== id)
          : [...p.allowedVenues, id],
      };
    });
  };

  const runPrepare = useCallback(async () => {
    if (!address || !agentWalletValid) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/register/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: agentWallet, guardWallet: address, policy }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        memoText?: string;
        policyHash?: string;
        meetsMinimum?: boolean;
      };
      if (!res.ok || !json.ok || !json.memoText || !json.policyHash) {
        throw new Error(json.error ?? `prepare failed (${res.status})`);
      }
      if (!json.meetsMinimum) throw new Error("$GUARD balance below minimum");
      setPrepare({ memoText: json.memoText, policyHash: json.policyHash });
      setStep("sign");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [address, agentWallet, agentWalletValid, policy]);

  const signAndConfirm = useCallback(async () => {
    if (!prepare || !address || !provider) return;
    setError(null);
    setBusy(true);
    try {
      const signature = await sendPolicyMemoTransaction(provider, prepare.memoText);
      const res = await fetch("/api/register/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: agentWallet,
          guardWallet: address,
          signature,
          policyHash: prepare.policyHash,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        embedHtml?: string;
        webhookSyncWarning?: string;
        agent?: { registrationSig: string };
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `confirm failed (${res.status})`);
      setResult({
        signature: json.agent?.registrationSig ?? signature,
        embedHtml: json.embedHtml ?? "",
        webhookSyncWarning: json.webhookSyncWarning,
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [prepare, address, agentWallet, provider]);

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[#8888aa]">
        {STEPS.map((s, idx) => (
          <li
            key={s}
            className={cn(
              "rounded-full border px-3 py-1",
              idx <= stepIndex ? "border-[#00f5c4] text-[#00f5c4]" : "border-[#ffffff18]",
            )}
          >
            {idx + 1}. {s}
          </li>
        ))}
      </ol>

      {step === "connect" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Connect your agent wallet</h2>
          <p className="text-[#8888aa]">
            This is the wallet your agent trades from. Not your personal wallet.
          </p>
          <WalletConnect variant="panel" />
        </div>
      )}

      {address && step !== "connect" && (
        <div className="sg-card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#8888aa]">Connected wallet</p>
            <p className="truncate font-mono text-sm">
              {walletName ? `${walletName} · ` : ""}
              {address}
            </p>
          </div>
          <button type="button" className="sg-btn-ghost h-10 min-h-10" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}

      {step === "guard" && address && (
        <div className="space-y-4">
          <GuardBalanceGate wallet={address} onBalance={setGate} />
          {canContinueGuard && (
            <button type="button" className="sg-btn-primary w-full" onClick={() => setStep("policy")}>
              Continue to policy →
            </button>
          )}
        </div>
      )}

      {step === "policy" && address && (
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">Publish policy</h2>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={useDifferentWallet}
                onChange={(e) => setUseDifferentWallet(e.target.checked)}
              />
              Watch a different trading wallet. $GUARD stays on the connected wallet.
            </label>
            {useDifferentWallet ? (
              <input
                className="sg-input font-mono"
                value={watchedWallet}
                onChange={(e) => setWatchedWallet(e.target.value.trim())}
                placeholder="Trading wallet public key"
                spellCheck={false}
              />
            ) : (
              <p className="font-mono text-xs break-all text-[#8888aa]">{address}</p>
            )}
            {useDifferentWallet && watchedWallet && !agentWalletValid ? (
              <p className="text-xs text-[#ff3b3b]">Enter a valid Solana address.</p>
            ) : null}

            <label className="block text-sm">
              Agent name
              <input
                className="sg-input mt-2"
                value={policy.name}
                onChange={(e) => setPolicy((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              Max drawdown {policy.maxDrawdownPct}%
              <input
                type="range"
                min={1}
                max={50}
                value={policy.maxDrawdownPct}
                className="mt-2 w-full accent-[#00f5c4]"
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, maxDrawdownPct: Number(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              Max spend per transaction (SOL)
              <input
                type="number"
                step="0.01"
                min={0.01}
                className="sg-input mt-2 font-mono"
                value={policy.maxSpendPerTxSol}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, maxSpendPerTxSol: Number(e.target.value) }))
                }
              />
            </label>
            <fieldset className="text-sm">
              <legend className="mb-2">Allowed venues</legend>
              <div className="flex flex-wrap gap-3">
                {VENUE_OPTIONS.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 rounded-full border border-[#ffffff18] px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={policy.allowedVenues.includes(v.id)}
                      onChange={() => toggleVenue(v.id)}
                    />
                    {v.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              Heartbeat interval
              <select
                className="sg-input mt-2"
                value={policy.heartbeatIntervalSec}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, heartbeatIntervalSec: Number(e.target.value) }))
                }
              >
                {HEARTBEATS.map((h) => (
                  <option key={h.sec} value={h.sec}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="sg-btn-primary w-full"
              onClick={() => void runPrepare()}
              disabled={busy || !agentWalletValid}
            >
              {busy ? "Preparing…" : "Continue to sign →"}
            </button>
          </div>
          <PolicyCard
            live
            policy={{
              name: policy.name,
              maxDrawdownPct: policy.maxDrawdownPct,
              maxSpendPerTxSol: policy.maxSpendPerTxSol,
              allowedVenues: policy.allowedVenues,
            }}
          />
        </div>
      )}

      {step === "sign" && prepare && (
        <div className="sg-card space-y-5 p-6">
          <h2 className="text-2xl font-bold">Sign and submit</h2>
          <p className="text-[#8888aa]">
            This publishes your policy as an onchain transaction. It is permanent and immutable.
          </p>
          <p className="font-mono text-xs text-[#00f5c4]">
            Policy hash: {prepare.policyHash.slice(0, 16)}…
          </p>
          <button
            type="button"
            className="sg-btn-primary w-full"
            onClick={() => void signAndConfirm()}
            disabled={busy || !provider}
          >
            {busy ? "Signing…" : "Sign and Register"}
          </button>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-6">
          <div className="sg-card p-8 text-center">
            <StatusBadge status="GREEN" size="lg" />
            <h2 className="mt-4 text-3xl font-extrabold">Your agent is registered.</h2>
            <p className="mt-2 text-[#8888aa]">Policy memo confirmed on Solana.</p>
          </div>
          <BadgeEmbed wallet={agentWallet} />
          {result.webhookSyncWarning ? (
            <p className="text-sm text-[#8888aa]">{result.webhookSyncWarning}</p>
          ) : null}
          <Link href={`/agent/${agentWallet}`} className="sg-btn-primary">
            View your agent page →
          </Link>
        </div>
      )}

      {error ? (
        <p className="rounded-2xl border border-[#ff3b3b]/40 bg-[#ff3b3b]/10 px-4 py-3 text-sm text-[#ff3b3b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
