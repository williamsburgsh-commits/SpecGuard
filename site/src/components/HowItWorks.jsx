import { Card } from '@heroui/react';
import { SectionReveal } from './SectionReveal';

const STEPS = [
  {
    num: '01 · SPEC',
    title: 'Public spec is law',
    body: 'Max notional, inventory, drawdown, and leverage are pinned in JSON. Anyone can verify the hash onchain and on GitHub.',
  },
  {
    num: '02 · QUOTE',
    title: 'Tiny quotes within limits',
    body: 'Post-only bid/ask on SOL-PERP subaccount 1. Pre-checks block orders that would breach before they hit the book.',
  },
  {
    num: '03 · FLATTEN',
    title: 'Breach → cancel → close → RED',
    body: 'Armed automation cancels all orders, closes position, publishes attestation sigs. Status goes RED until manual reset.',
  },
];

export function HowItWorks() {
  return (
    <SectionReveal id="how">
      <p className="section-eyebrow">Architecture</p>
      <h2>How it works</h2>
      <p className="section-lead">Three layers: published limits, autonomous quoting, enforced shutdown.</p>
      <div className="steps-grid">
        {STEPS.map((step, index) => (
          <Card key={step.num} variant="secondary" className="step-card">
            <Card.Header>
              <p className="step-num">{step.num}</p>
              <Card.Title className="font-display text-lg">{step.title}</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-muted m-0 text-[0.95rem] leading-relaxed">{step.body}</p>
            </Card.Content>
            <span className="step-watermark" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
          </Card>
        ))}
      </div>
    </SectionReveal>
  );
}
