import { Card } from '@heroui/react';
import { SectionReveal } from './SectionReveal';

export function Compare() {
  return (
    <SectionReveal>
      <p className="section-eyebrow">Differentiator</p>
      <h2>Why SpecGuard</h2>
      <p className="section-lead">
        ClawPump ships <code>risk-manager</code> — advice only. SpecGuard inverts that.
      </p>
      <div className="compare-grid">
        <Card variant="secondary" className="compare-card">
          <Card.Header>
            <Card.Title className="font-mono text-sm text-muted">risk-manager</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-muted m-0 text-[0.95rem] leading-relaxed">
              Pre-trade sizing and drawdown <em>recommendations</em>. Last rule: never block a trade — only recommend.
            </p>
          </Card.Content>
        </Card>
        <Card variant="secondary" className="compare-card compare-card-us">
          <Card.Header>
            <Card.Title className="font-mono text-sm text-accent-brand">specguard-enforcer</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-muted m-0 text-[0.95rem] leading-relaxed">
              <strong className="text-foreground font-semibold">Blocks, then flattens.</strong>{' '}
              Skill law + armed automation. Judges verify shutdown on Solscan, not in a chat log.
            </p>
          </Card.Content>
        </Card>
      </div>
    </SectionReveal>
  );
}
