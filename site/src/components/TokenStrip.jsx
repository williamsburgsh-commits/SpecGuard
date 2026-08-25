import { Link } from '@heroui/react';
import { AGENT_ID, GUARD_MINT } from '../lib/constants';
import { ExternalButton } from './ExternalButton';
import { SectionReveal } from './SectionReveal';

const FEE_DASHBOARD = `https://agents.clawpump.tech/dashboard/wallet?agent=${AGENT_ID}`;
const PUMP_URL = `https://pump.fun/coin/${GUARD_MINT}`;

export function TokenStrip() {
  return (
    <SectionReveal id="token">
      <p className="section-eyebrow">Token</p>
      <h2>$GUARD</h2>
      <p className="section-lead">
        Fee-claim token for the reference operator — not governance. Treasury can buy $ANSEM on the
        flatten tape (Phase 13).
      </p>
      <div className="token-card">
        <div className="token-inner">
          <span className="token-symbol">$GUARD</span>
          <div className="token-meta">
            <div className="token-mint">{GUARD_MINT}</div>
            <Link href={PUMP_URL} target="_blank" rel="noopener noreferrer">
              View on pump.fun
              <Link.Icon />
            </Link>
          </div>
          <ExternalButton href={FEE_DASHBOARD} className="sg-btn-gradient">
            Fee dashboard
          </ExternalButton>
        </div>
      </div>
    </SectionReveal>
  );
}
