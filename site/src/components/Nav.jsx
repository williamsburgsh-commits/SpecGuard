import { Chip } from '@heroui/react';
import { DASHBOARD_URL, REGISTRY_URL, SPEC_URL } from '../lib/constants';
import { NAV, VERSION_BADGE } from '../lib/marketingCopy';
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
        <span className="nav-brand-text">
          SpecGuard
          <span className="nav-version-badge">{VERSION_BADGE}</span>
        </span>
      </a>
      <ul className="nav-links">
        <li><a href="#">{NAV.phoenixPerps}</a></li>
        <li><a href="#how">{NAV.howItWorks}</a></li>
        <li><a href="#live">{NAV.liveStatus}</a></li>
        <li><a href="#token">{NAV.guard}</a></li>
        <li>
          <a href={REGISTRY_URL} target="_blank" rel="noopener noreferrer">
            {NAV.verification}
          </a>
        </li>
        <li><a href={specUrl} target="_blank" rel="noopener noreferrer">{NAV.spec}</a></li>
      </ul>
      <div className="nav-actions">
        <Chip size="sm" variant="soft" className="nav-ticker font-mono">
          <span className={`nav-ticker-dot ${isLive ? 'live' : ''}`} aria-hidden="true" />
          <Chip.Label>{loading ? '…' : hbLabel}</Chip.Label>
        </Chip>
        <ExternalButton href={REGISTRY_URL} variant="ghost">
          {NAV.registerAgent}
        </ExternalButton>
        <ExternalButton href={dashboardUrl} className="sg-btn-gradient">
          ClawPump
        </ExternalButton>
      </div>
    </header>
  );
}
