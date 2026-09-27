import { cn } from "@/lib/utils";
import { solscanTx } from "@/lib/solana/explorer";

export type PolicyCardData = {
  name?: string;
  agentType?: string;
  /** Absent on V2 policies for non-trading agents. */
  maxDrawdownPct?: number | null;
  maxSpendPerTxSol: number;
  allowedVenues?: string[];
  dailySpendSol?: number | null;
  heartbeatIntervalSec?: number | null;
  socialLimits?: Record<string, unknown> | null;
  allowedTools?: string[] | null;
  deniedActions?: string[] | null;
  registeredAt?: string | null;
  memoSig?: string | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#8888aa]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function heartbeatLabel(sec: number): string {
  if (sec % 3600 === 0) return `${sec / 3600}h`;
  if (sec % 60 === 0) return `${sec / 60}min`;
  return `${sec}s`;
}

function socialRows(limits: Record<string, unknown>): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  const posts = limits.maxPostsPerDay;
  if (typeof posts === "number") {
    rows.push(
      <Row key="posts" label="Max posts / day">
        <span className="font-mono">{posts}</span>
      </Row>,
    );
  }
  if (typeof limits.allowDMs === "boolean") {
    rows.push(
      <Row key="dms" label="Direct messages">
        {limits.allowDMs ? "Allowed" : "Blocked"}
      </Row>,
    );
  }
  const platforms = limits.platforms;
  if (Array.isArray(platforms) && platforms.length > 0) {
    rows.push(
      <Row key="platforms" label="Platforms">
        {platforms.join(" / ")}
      </Row>,
    );
  }
  return rows;
}

export function PolicyCard({
  policy,
  className,
  live,
}: {
  policy: PolicyCardData;
  className?: string;
  live?: boolean;
}) {
  const venues = policy.allowedVenues?.length
    ? policy.allowedVenues.join(" / ")
    : null;

  return (
    <div className={cn("sg-card p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8888aa]">
          {live ? "Live preview" : "Published Policy"}
        </p>
        {policy.agentType ? (
          <span className="rounded-full border border-[#00f5c4]/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#00f5c4]">
            {policy.agentType}
          </span>
        ) : null}
      </div>
      {policy.name ? (
        <h3 className="mt-2 text-xl font-bold tracking-tight">{policy.name}</h3>
      ) : null}
      <dl className="mt-6 space-y-3 text-sm">
        <Row label="Max spend per tx">
          <span className="font-mono">{policy.maxSpendPerTxSol} SOL</span>
        </Row>
        {policy.dailySpendSol != null ? (
          <Row label="Max spend per day">
            <span className="font-mono">{policy.dailySpendSol} SOL</span>
          </Row>
        ) : null}
        {policy.heartbeatIntervalSec != null ? (
          <Row label="Heartbeat">
            <span className="font-mono">
              {heartbeatLabel(policy.heartbeatIntervalSec)}
            </span>
          </Row>
        ) : null}
        {policy.maxDrawdownPct != null ? (
          <Row label="Max drawdown">
            <span className="font-mono">{policy.maxDrawdownPct}%</span>
          </Row>
        ) : null}
        {venues ? <Row label="Allowed venues">{venues}</Row> : null}
        {policy.socialLimits ? socialRows(policy.socialLimits) : null}
        {policy.allowedTools?.length ? (
          <Row label="Allowed tools">{policy.allowedTools.join(" / ")}</Row>
        ) : null}
        {policy.deniedActions?.length ? (
          <Row label="Denied actions">{policy.deniedActions.join(" / ")}</Row>
        ) : null}
        {policy.registeredAt ? (
          <Row label="Registered">
            {new Date(policy.registeredAt).toLocaleDateString()}
          </Row>
        ) : null}
        {policy.memoSig ? (
          <Row label="Policy tx">
            <a
              href={solscanTx(policy.memoSig)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[#00f5c4] hover:underline"
            >
              {policy.memoSig.slice(0, 8)}…{policy.memoSig.slice(-6)}
            </a>
          </Row>
        ) : null}
      </dl>
      <p className="mt-6 border-t border-[#ffffff0f] pt-4 text-xs leading-relaxed text-[#8888aa]">
        These limits are immutable onchain. This card reads from chain, not a database.
      </p>
    </div>
  );
}
