import {
  Alert,
  Button,
  Card,
  Chip,
  Disclosure,
  Link,
  ProgressBar,
  Skeleton,
  Tooltip,
} from '@heroui/react';
import { AGENT_ID, DASHBOARD_URL, REPO_RAW } from '../lib/constants';
import {
  formatAge,
  formatUsd,
  heroHint,
  limitPct,
  limitProgressColor,
  statusChipColor,
  truncateHash,
} from '../lib/statusDisplay';
import { useReveal } from '../hooks/useReveal';

function TerminalRow({ label, children }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="terminal-value">{children}</dd>
    </>
  );
}

function SigLink({ sig }) {
  if (!sig) return '—';
  return (
    <Link href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">
      <code>{sig.slice(0, 8)}…</code>
    </Link>
  );
}

function LimitBar({ value, max, label }) {
  const pct = limitPct(value ?? 0, max);
  const color = limitProgressColor(pct);
  return (
    <ProgressBar aria-label={label} className="mt-1 w-full" value={pct} color={color} size="sm">
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function TerminalCard({ title, wide, loading, children, bare = false }) {
  if (loading) {
    return (
      <Card variant="secondary" className={`terminal-card ${wide ? 'card-wide' : ''}`.trim()}>
        <Skeleton className="mb-4 h-4 w-28 rounded" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
          <Skeleton className="h-3 w-4/6 rounded" />
          <Skeleton className="h-3 w-full rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="secondary" className={`terminal-card ${wide ? 'card-wide' : ''}`.trim()}>
      <Card.Header>
        <Card.Title className="terminal-card-title">{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        {bare ? children : <dl className="terminal-dl">{children}</dl>}
      </Card.Content>
    </Card>
  );
}

const PROOF_LINKS = (data, portfolioUrl, dashboardUrl, wallet, hbProof) =>
  [
    { href: portfolioUrl, label: 'ClawPump portfolio' },
    { href: dashboardUrl, label: 'Agent dashboard' },
    { href: `https://solscan.io/account/${wallet}`, label: 'Solscan wallet' },
    hbProof && { href: hbProof, label: 'Heartbeat proof' },
    { href: 'https://github.com/williamsburgsh-commits/SpecGuard', label: 'GitHub repo' },
    { href: data.spec_url, label: 'Raw spec JSON' },
  ].filter(Boolean);

export function TerminalDashboard({ data, computed, error, loading }) {
  const ref = useReveal();
  const isLoading = loading && !data;
  const agentId = data?.agent_id || AGENT_ID;
  const dashboardUrl = DASHBOARD_URL.replace(/agent=[^&]+/, `agent=${agentId}`);
  const portfolioUrl = `${dashboardUrl}&tab=portfolio`;
  const wallet = data?.wallet_address;
  const q = data?.quoting || {};
  const pnl = data?.pnl || {};
  const limits = pnl.spec_limits || {};
  const fills = data?.fills || {};
  const hbProof = data?.last_heartbeat_proof
    ? `${REPO_RAW}/${data.last_heartbeat_proof}`
    : null;

  return (
    <section ref={ref} className="section terminal-section reveal" id="live">
      <div className="terminal-header">
        <div>
          <p className="section-eyebrow">Live feed</p>
          <h2>Operator terminal</h2>
          <p className="section-lead" style={{ marginBottom: 0 }}>
            Machine-readable state from <code>status.json</code> — refreshed every 15s.
          </p>
        </div>
        <div className="terminal-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>

      {error && !data && (
        <Alert status="warning" className="mb-4">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Could not load status</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="terminal-grid">
        <TerminalCard title="Live state" loading={isLoading}>
          {computed && (
            <>
              <TerminalRow label="Operator status">
                <Chip color={statusChipColor(computed.operatorStatus)} variant="soft" size="sm" className="terminal-chip">
                  <Chip.Label>{computed.operatorStatus}</Chip.Label>
                </Chip>
              </TerminalRow>
              <TerminalRow label="Display status">
                <Chip color={statusChipColor(computed.displayStatus)} variant="soft" size="sm" className="terminal-chip">
                  <Chip.Label>{computed.displayStatus}</Chip.Label>
                </Chip>
              </TerminalRow>
              <TerminalRow label="Last heartbeat">{data.last_heartbeat_at || 'never'}</TerminalRow>
              <TerminalRow label="Heartbeat age">
                {computed.ageSec == null ? '—' : formatAge(computed.ageSec)}
              </TerminalRow>
              <TerminalRow label="TTL">{computed.ttl}s</TerminalRow>
              <TerminalRow label="Copy-trade">
                <Chip
                  color={computed.copyEligible ? 'success' : 'warning'}
                  variant="soft"
                  size="sm"
                  className="terminal-chip"
                >
                  <Chip.Label>{computed.copyEligible ? 'eligible' : 'not eligible'}</Chip.Label>
                </Chip>
              </TerminalRow>
              <TerminalRow label="Agent ID">
                <code>{agentId}</code>
              </TerminalRow>
            </>
          )}
        </TerminalCard>

        <TerminalCard title="Public spec" loading={isLoading}>
          {data && (
            <>
              <TerminalRow label="Market">{data.market || '—'}</TerminalRow>
              <TerminalRow label="Spec URL">
                <Link href={data.spec_url} target="_blank" rel="noopener noreferrer">
                  {data.spec_url}
                </Link>
              </TerminalRow>
              <TerminalRow label="Spec SHA256">
                <Tooltip delay={0}>
                  <code>{truncateHash(data.spec_sha256)}</code>
                  <Tooltip.Content>
                    <p className="font-mono text-xs">{data.spec_sha256}</p>
                  </Tooltip.Content>
                </Tooltip>
              </TerminalRow>
            </>
          )}
        </TerminalCard>

        <TerminalCard title="Quoting activity" loading={isLoading}>
          {data && (
            <>
              <TerminalRow label="Operator">{q.operator || '—'}</TerminalRow>
              <TerminalRow label="Spread">
                {q.spread_bps != null ? `${q.spread_bps} bps` : '—'}
              </TerminalRow>
              <TerminalRow label="Last cycle">{q.last_cycle_at || '—'}</TerminalRow>
              <TerminalRow label="Last action">{q.last_action || '—'}</TerminalRow>
              <TerminalRow label="Cycles (total)">
                {q.cycles_total != null ? String(q.cycles_total) : '—'}
              </TerminalRow>
              <TerminalRow label="Posts / cancels">
                {q.posts_total != null && q.cancels_total != null
                  ? `${q.posts_total} / ${q.cancels_total}`
                  : '—'}
              </TerminalRow>
              <TerminalRow label="Last mark">
                {q.last_mark_usd != null ? `$${q.last_mark_usd}` : '—'}
              </TerminalRow>
              <TerminalRow label="Last bid sig"><SigLink sig={q.last_bid_sig} /></TerminalRow>
              <TerminalRow label="Last ask sig"><SigLink sig={q.last_ask_sig} /></TerminalRow>
              <TerminalRow label="Open orders">
                {q.open_order_count != null ? String(q.open_order_count) : '—'}
              </TerminalRow>
            </>
          )}
        </TerminalCard>

        <TerminalCard title="PnL overlay" loading={isLoading}>
          {data && (
            <>
              <TerminalRow label="Baseline equity">{formatUsd(pnl.baseline_equity_usd)}</TerminalRow>
              <TerminalRow label="Current equity">{formatUsd(pnl.current_equity_usd)}</TerminalRow>
              <TerminalRow label="Unrealized PnL">{formatUsd(pnl.unrealized_pnl_usd)}</TerminalRow>
              <TerminalRow label="Drawdown">
                <div>
                  {formatUsd(pnl.drawdown_usd)} / {formatUsd(limits.max_drawdown_usd)}
                  <LimitBar
                    value={pnl.drawdown_usd ?? 0}
                    max={limits.max_drawdown_usd ?? 40}
                    label="Drawdown"
                  />
                </div>
              </TerminalRow>
              <TerminalRow label="Inventory">
                <div>
                  {formatUsd(pnl.inventory_usd)} / {formatUsd(limits.max_inventory_usd)}
                  <LimitBar
                    value={pnl.inventory_usd ?? 0}
                    max={limits.max_inventory_usd ?? 100}
                    label="Inventory"
                  />
                </div>
              </TerminalRow>
              <TerminalRow label="Leverage">
                {pnl.leverage != null && limits.max_leverage != null
                  ? `${pnl.leverage} / ${limits.max_leverage}`
                  : '—'}
              </TerminalRow>
              <TerminalRow label="Within spec">
                {pnl.within_spec == null ? (
                  '—'
                ) : (
                  <Chip color={pnl.within_spec ? 'success' : 'danger'} variant="soft" size="sm" className="terminal-chip">
                    <Chip.Label>{pnl.within_spec ? 'yes' : 'no'}</Chip.Label>
                  </Chip>
                )}
              </TerminalRow>
              <TerminalRow label="Updated">{pnl.updated_at || '—'}</TerminalRow>
            </>
          )}
        </TerminalCard>

        <TerminalCard title="Fills" loading={isLoading}>
          {data && (
            <>
              <TerminalRow label="Fill count">{fills.count != null ? String(fills.count) : '0'}</TerminalRow>
              <TerminalRow label="Last fill">{fills.last_fill_at || '—'}</TerminalRow>
              <TerminalRow label="Position size">
                {fills.position_size_sol != null ? `${fills.position_size_sol} SOL` : '—'}
              </TerminalRow>
              <TerminalRow label="Last fill sig"><SigLink sig={fills.last_fill_sig} /></TerminalRow>
            </>
          )}
        </TerminalCard>

        <TerminalCard title="Proof links" wide bare loading={isLoading}>
          {data && (
            <div className="proof-links-grid">
              {PROOF_LINKS(data, portfolioUrl, dashboardUrl, wallet, hbProof).map(({ href, label }) => (
                <Link
                  key={label}
                  className="proof-link-item"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                  <Link.Icon aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </TerminalCard>

        <Card variant="secondary" className="terminal-card card-wide">
          <Card.Content>
            <Disclosure>
              <Disclosure.Heading>
                <Button slot="trigger" variant="ghost" className="disclosure-trigger w-full">
                  <span>STALE / copy-trade rules</span>
                  <Disclosure.Indicator />
                </Button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="text-muted text-sm leading-relaxed">
                  <p>
                    Copy-trade is eligible only when <strong>operator status is GREEN</strong> and the
                    heartbeat is fresh.
                  </p>
                  <ul className="my-3 list-inside list-disc space-y-1">
                    <li><code>heartbeat_age = now - last_heartbeat_at</code></li>
                    <li><strong>STALE</strong> if heartbeat age &gt; TTL (300s)</li>
                    <li><strong>Copy-trade eligible</strong> if GREEN and not STALE</li>
                    <li>Breach includes drawdown, inventory, notional, leverage, disallowed tools</li>
                  </ul>
                  {computed && (
                    <p className="text-muted text-sm">{heroHint(computed)}</p>
                  )}
                  {error && (
                    <Alert status="warning" className="mt-3">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          </Card.Content>
        </Card>
      </div>
    </section>
  );
}
