"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletConnect } from "@/app/components/chrome/WalletConnect";
// Type-only: the @specguardxyz/core barrel reaches node:crypto via policy/hash,
// which webpack cannot bundle for the browser.
import type { AgentType, PolicyV2, VenueSlug } from "@specguardxyz/core";
import {
  AGENT_TYPE_OPTIONS,
  defaultPolicyFor,
} from "@/lib/register/defaultPolicy";
import { GuardBalanceGate, type GuardBalancePayload } from "./GuardBalanceGate";
import { sendPolicyMemoTransaction } from "@/lib/register/sendPolicyMemo";
import { walletAdapterToProvider } from "@/lib/wallet/walletAdapterProvider";
import { cn } from "@/lib/utils";
import { isLikelySolanaAddress } from "@/lib/solana/rpc";
import { PolicyCard } from "@/components/ui/PolicyCard";
import { BadgeEmbed } from "@/components/ui/BadgeEmbed";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Step = "connect" | "guard" | "type" | "policy" | "sign" | "done";
const STEPS: Step[] = ["connect", "guard", "type", "policy", "sign", "done"];

const VENUE_OPTIONS: { id: VenueSlug; label: string }[] = [
  { id: "jupiter-swap", label: "Jupiter" },
  { id: "jupiter-trigger", label: "Jupiter Trigger" },
  { id: "spl-token", label: "Other" },
];
const HEARTBEATS = [
  { sec: 60, label: "1min" },
  { sec: 300, label: "5min" },
  { sec: 900, label: "15min" },
  { sec: 3600, label: "1h" },
];
const PLATFORM_OPTIONS = ["x", "telegram", "discord", "farcaster"];

const TYPE_COPY: Record<AgentType, { title: string; blurb: string }> = {
  trader: {
    title: "Trader",
    blurb: "Trades onchain. Enforce drawdown limits and which venues it may touch.",
  },
  social: {
    title: "Social",
    blurb: "Posts and messages. Enforce posts per day, DMs, and which platforms.",
  },
  data: {
    title: "Data",
    blurb: "Reads and indexes. Enforce which tools it may call and what it may spend.",
  },
  infra: {
    title: "Infra",
    blurb: "Runs jobs and services. Enforce spend caps and forbidden actions.",
  },
  general: {
    title: "General",
    blurb: "Anything else. Start with spend caps and a heartbeat, add limits as needed.",
  },
};

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

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
  const [policy, setPolicy] = useState<PolicyV2>(defaultPolicyFor("trader"));
  const [prepare, setPrepare] = useState<{ memoText: string; policyHash: string } | null>(
    null,
  );
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

  const chooseType = (type: AgentType) => {
    setPolicy((p) => ({ ...defaultPolicyFor(type), name: p.name }));
    setStep("policy");
  };

  const toggleVenue = (id: VenueSlug) => {
    setPolicy((p) => {
      const current = p.allowedVenues ?? [];
      const has = current.includes(id);
      if (has && current.length <= 1) return p;
      return {
        ...p,
        allowedVenues: has ? current.filter((v) => v !== id) : [...current, id],
      };
    });
  };

  const togglePlatform = (name: string) => {
    setPolicy((p) => {
      const current = p.socialLimits?.platforms ?? [];
      const has = current.includes(name);
      return {
        ...p,
        socialLimits: {
          ...p.socialLimits,
          platforms: has ? current.filter((v) => v !== name) : [...current, name],
        },
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
            This is the wallet your agent operates from. Not your personal wallet.
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
          <button
            type="button"
            className="sg-btn-ghost h-10 min-h-10"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </div>
      )}

      {step === "guard" && address && (
        <div className="space-y-4">
          <GuardBalanceGate wallet={address} onBalance={setGate} />
          {canContinueGuard && (
            <button
              type="button"
              className="sg-btn-primary w-full"
              onClick={() => setStep("type")}
            >
              Continue →
            </button>
          )}
        </div>
      )}

      {step === "type" && address && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold">What does your agent do?</h2>
            <p className="mt-2 text-[#8888aa]">
              This decides which limits your policy enforces. Every agent gets a spend cap
              and a heartbeat — the rest depends on the work.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {AGENT_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => chooseType(t)}
                className={cn(
                  "sg-card p-5 text-left transition-colors hover:border-[#00f5c4]/60",
                  policy.type === t && "border-[#00f5c4]",
                )}
              >
                <p className="text-lg font-bold">{TYPE_COPY[t].title}</p>
                <p className="mt-1 text-sm text-[#8888aa]">{TYPE_COPY[t].blurb}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "policy" && address && (
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Publish policy</h2>
              <button
                type="button"
                className="sg-btn-ghost h-9 min-h-9 text-xs"
                onClick={() => setStep("type")}
              >
                Change type
              </button>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={useDifferentWallet}
                onChange={(e) => setUseDifferentWallet(e.target.checked)}
              />
              Watch a different wallet. $GUARD stays on the connected wallet.
            </label>
            {useDifferentWallet ? (
              <input
                className="sg-input font-mono"
                value={watchedWallet}
                onChange={(e) => setWatchedWallet(e.target.value.trim())}
                placeholder="Agent wallet public key"
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
                maxLength={64}
                onChange={(e) => setPolicy((p) => ({ ...p, name: e.target.value }))}
              />
            </label>

            <label className="block text-sm">
              Max spend per transaction (SOL)
              <input
                type="number"
                step="0.01"
                min={0.01}
                className="sg-input mt-2 font-mono"
                value={policy.spendLimits.perTxSol}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    spendLimits: { ...p.spendLimits, perTxSol: Number(e.target.value) },
                  }))
                }
              />
            </label>

            <label className="block text-sm">
              Max spend per day (SOL) — optional
              <input
                type="number"
                step="0.1"
                min={0}
                placeholder="no daily cap"
                className="sg-input mt-2 font-mono"
                value={policy.spendLimits.dailySol ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPolicy((p) => ({
                    ...p,
                    spendLimits: {
                      ...p.spendLimits,
                      ...(v === "" || Number(v) <= 0
                        ? { dailySol: undefined }
                        : { dailySol: Number(v) }),
                    },
                  }));
                }}
              />
            </label>

            <label className="block text-sm">
              Heartbeat interval
              <select
                className="sg-input mt-2"
                value={policy.heartbeatIntervalSec}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    heartbeatIntervalSec: Number(e.target.value),
                  }))
                }
              >
                {HEARTBEATS.map((h) => (
                  <option key={h.sec} value={h.sec}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>

            {policy.type === "trader" && (
              <>
                <label className="block text-sm">
                  Max drawdown {policy.maxDrawdownPct ?? 10}%
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={policy.maxDrawdownPct ?? 10}
                    className="mt-2 w-full accent-[#00f5c4]"
                    onChange={(e) =>
                      setPolicy((p) => ({ ...p, maxDrawdownPct: Number(e.target.value) }))
                    }
                  />
                </label>
                <fieldset className="text-sm">
                  <legend className="mb-2">Allowed venues</legend>
                  <div className="flex flex-wrap gap-3">
                    {VENUE_OPTIONS.map((v) => (
                      <label
                        key={v.id}
                        className="flex items-center gap-2 rounded-full border border-[#ffffff18] px-3 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={policy.allowedVenues?.includes(v.id) ?? false}
                          onChange={() => toggleVenue(v.id)}
                        />
                        {v.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {policy.type === "social" && (
              <>
                <label className="block text-sm">
                  Max posts per day
                  <input
                    type="number"
                    min={1}
                    className="sg-input mt-2 font-mono"
                    value={policy.socialLimits?.maxPostsPerDay ?? 20}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        socialLimits: {
                          ...p.socialLimits,
                          maxPostsPerDay: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={policy.socialLimits?.allowDMs ?? false}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        socialLimits: { ...p.socialLimits, allowDMs: e.target.checked },
                      }))
                    }
                  />
                  Allow direct messages
                </label>
                <fieldset className="text-sm">
                  <legend className="mb-2">Platforms</legend>
                  <div className="flex flex-wrap gap-3">
                    {PLATFORM_OPTIONS.map((name) => (
                      <label
                        key={name}
                        className="flex items-center gap-2 rounded-full border border-[#ffffff18] px-3 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={policy.socialLimits?.platforms?.includes(name) ?? false}
                          onChange={() => togglePlatform(name)}
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {(policy.type === "data" ||
              policy.type === "infra" ||
              policy.type === "general") && (
              <label className="block text-sm">
                Allowed tools — comma separated, blank for any
                <input
                  className="sg-input mt-2 font-mono text-xs"
                  placeholder="firecrawl-search, alchemy-rpc"
                  value={policy.allowedTools?.join(", ") ?? ""}
                  onChange={(e) => {
                    const list = parseList(e.target.value);
                    setPolicy((p) => ({
                      ...p,
                      allowedTools: list.length > 0 ? list : undefined,
                    }));
                  }}
                />
              </label>
            )}

            {(policy.type === "infra" ||
              policy.type === "general" ||
              policy.type === "data") && (
              <label className="block text-sm">
                Denied actions — comma separated, blank for none
                <input
                  className="sg-input mt-2 font-mono text-xs"
                  placeholder="transfer_to_unknown, delete_data"
                  value={policy.deniedActions?.join(", ") ?? ""}
                  onChange={(e) => {
                    const list = parseList(e.target.value);
                    setPolicy((p) => ({
                      ...p,
                      deniedActions: list.length > 0 ? list : undefined,
                    }));
                  }}
                />
              </label>
            )}

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
              agentType: policy.type,
              maxDrawdownPct: policy.maxDrawdownPct ?? null,
              maxSpendPerTxSol: policy.spendLimits.perTxSol,
              allowedVenues: policy.allowedVenues,
              dailySpendSol: policy.spendLimits.dailySol ?? null,
              heartbeatIntervalSec: policy.heartbeatIntervalSec,
              socialLimits: policy.socialLimits ?? null,
              allowedTools: policy.allowedTools ?? null,
              deniedActions: policy.deniedActions ?? null,
            }}
          />
        </div>
      )}

      {step === "sign" && prepare && (
        <div className="sg-card space-y-5 p-6">
          <h2 className="text-2xl font-bold">Sign and submit</h2>
          <p className="text-[#8888aa]">
            This publishes your policy as an onchain transaction. It is permanent and
            immutable.
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
