import { Chip } from '@heroui/react';
import { DASHBOARD_URL, SPEC_URL } from '../lib/constants';
import { ExternalButton, HashButton } from './ExternalButton';

const BASE = import.meta.env.BASE_URL;

export function Nav({ data, computed, loading }) {
  const agentId = data?.agent_id;
  const dashboardUrl = agentId
    ? DASHBOARD_URL.replace(/agent=[^&]+/, `agent=${agentId}`)
    : DASHBOARD_URL;
  const specUrl = data?.spec_url || SPEC_URL;
  const isLive = computed?.displayStatus === 'GREEN';
  const hbLabel = data?.last_heartbeat_at
    ? `HB ${new Date(data.last_heartbeat_at).toISOString().slice(11, 19)}Z`
    : '—';

  return (
    <header className="nav">
      <a className="nav-brand" href="#">
        <img src={`${BASE}assets/pfp.png`} alt="SpecGuard" width="38" height="38" />
        SpecGuard
      </a>
      <ul className="nav-links">
        <li><a href="#how">How it works</a></li>
        <li><a href="#live">Live terminal</a></li>
        <li><a href="#token">$GUARD</a></li>
        <li><a href={specUrl} target="_blank" rel="noopener noreferrer">Spec</a></li>
      </ul>
      <div className="nav-actions">
        <Chip size="sm" variant="soft" className="nav-ticker font-mono">
          <span className={`nav-ticker-dot ${isLive ? 'live' : ''}`} aria-hidden="true" />
          <Chip.Label>{loading ? '…' : hbLabel}</Chip.Label>
        </Chip>
        <ExternalButton href="https://x.com/specguardxyz" variant="ghost">
          @specguardxyz
        </ExternalButton>
        <ExternalButton href={dashboardUrl} className="sg-btn-gradient">
          ClawPump
        </ExternalButton>
      </div>
    </header>
  );
}
