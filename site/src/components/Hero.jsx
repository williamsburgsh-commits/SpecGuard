import { useRef } from 'react';
import { Chip } from '@heroui/react';
import { DASHBOARD_URL, SPEC_URL } from '../lib/constants';
import { heroHint, statusChipColor } from '../lib/statusDisplay';
import { useHeroGrid } from '../hooks/useHeroGrid';
import { ExternalButton, HashButton } from './ExternalButton';

export function Hero({ data, computed, loading, error }) {
  const canvasRef = useRef(null);
  useHeroGrid(canvasRef);

  const agentId = data?.agent_id;
  const dashboardUrl = agentId
    ? DASHBOARD_URL.replace(/agent=[^&]+/, `agent=${agentId}`)
    : DASHBOARD_URL;
  const specUrl = data?.spec_url || SPEC_URL;

  let badgeLabel = 'LOADING';
  let badgeColor = 'default';
  if (error && !computed) {
    badgeLabel = 'ERROR';
    badgeColor = 'danger';
  } else if (computed) {
    badgeLabel = computed.displayStatus;
    badgeColor = statusChipColor(computed.displayStatus);
  }

  const hint = computed
    ? heroHint(computed, data?.pnl)
    : (error ? 'Could not load live status — retrying…' : 'Loading operator state…');

  return (
    <section className="hero">
      <canvas ref={canvasRef} className="hero-grid-canvas" aria-hidden="true" />
      <div className="hero-scan" aria-hidden="true" />
      <div className="hero-ring" aria-hidden="true" />
      <div className="hero-orbit" aria-hidden="true">
        <div className="hero-orbit-inner">
          <span className="orbit-particle" />
          <span className="orbit-particle" />
          <span className="orbit-particle" />
        </div>
        <div className="hero-orbit-core">
          <span className="orbit-core-dot" />
          <span className="orbit-core-ring" />
        </div>
      </div>
      <div className="hero-inner">
        <div className="hero-content">
          <Chip variant="soft" color="accent" size="sm" className="hero-tag">
            <span className="hero-tag-dot" aria-hidden="true" />
            <Chip.Label>ClawPump · Ansem Hackathon · SOL-PERP</Chip.Label>
          </Chip>
          <h1 className="hero-title">
            <span className="hero-line">
              <span className="hero-word">Spec-bound</span>{' '}
              <span className="hero-word">perps.</span>
            </span>
            <span className="hero-line hero-line-accent">
              <em>Flatten on breach.</em>
            </span>
          </h1>
          <p className="hero-sub">
            A ClawPump agent quoting isolated Phoenix perps under a public spec. On breach it cancels,
            closes onchain, posts signatures, and turns RED — the kill-switch is a tool call, not a
            recommendation.
          </p>
          <div className="hero-cta">
            <ExternalButton href={dashboardUrl} className="sg-btn-gradient">
              View operator
            </ExternalButton>
            <ExternalButton href={specUrl} variant="ghost">
              Read public spec
            </ExternalButton>
            <HashButton href="#live" variant="ghost">
              Live terminal ↓
            </HashButton>
          </div>
          <div className="hero-status">
            <Chip color={badgeColor} variant="soft" size="md" className="hero-status-chip font-mono uppercase tracking-wide">
              <Chip.Label>{loading && !computed ? 'LOADING' : badgeLabel}</Chip.Label>
            </Chip>
            <p className="hero-status-hint">{hint}</p>
          </div>
        </div>
      </div>
      <div className="hero-scroll" aria-hidden="true">
        <span className="hero-scroll-line" />
        <span className="hero-scroll-text">Scroll</span>
      </div>
    </section>
  );
}
