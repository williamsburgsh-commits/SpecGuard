const ITEMS = [
  'SOL-PERP · 50 bps spread',
  'Public spec · SHA256 verified',
  'Kill-switch onchain · not a recommendation',
  'Breach → cancel → close → RED',
  'Heartbeat TTL 300s',
  'Drawdown limit $40 · Inventory $100',
  '$GUARD · pump.fun',
  'ClawPump × Ansem Hackathon',
];

export function Ticker() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {track.map((item, i) => (
          <span key={`${item}-${i}`} className="ticker-item">{item}</span>
        ))}
      </div>
    </div>
  );
}
