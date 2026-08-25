import { Link } from '@heroui/react';

const FOOTER_GROUPS = [
  {
    title: 'Site',
    links: [
      { href: 'https://williamsburgsh-commits.github.io/SpecGuard/', label: 'Live site', external: true },
      { href: '#how', label: 'How it works' },
      { href: '#live', label: 'Live terminal' },
      { href: '#token', label: '$GUARD' },
    ],
  },
  {
    title: 'External',
    links: [
      { href: 'https://x.com/specguardxyz', label: 'X / Twitter', external: true },
      { href: 'https://github.com/williamsburgsh-commits/SpecGuard', label: 'GitHub', external: true },
      { href: 'https://clawpump.tech/ansemhack', label: 'Hackathon', external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand-block">
          <div className="footer-brand">SpecGuard</div>
          <p className="footer-disclaimer">
            Autonomous operator demo — not financial advice. Onchain actions are irreversible.
          </p>
        </div>
        <div className="footer-nav">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} className="footer-nav-group" aria-label={group.title}>
              <span className="footer-nav-label">{group.title}</span>
              <ul className="footer-nav-list">
                {group.links.map(({ href, label, external }) => (
                  <li key={label}>
                    {external ? (
                      <Link href={href} target="_blank" rel="noopener noreferrer">
                        {label}
                      </Link>
                    ) : (
                      <Link href={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <p className="footer-copy">
        © SpecGuard · ClawPump Ansem Hackathon · SOL-PERP reference operator
      </p>
    </footer>
  );
}
