import { Link } from '@heroui/react';
import { REGISTRY_URL, SPEC_URL } from '../lib/constants';
import { NAV, BRAND, TAGLINE } from '../lib/marketingCopy';

const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '#live', label: NAV.phoenixPerps },
      { href: REGISTRY_URL, label: NAV.verification, external: true },
      { href: `${REGISTRY_URL}/registry`, label: NAV.agents, external: true },
      { href: `${REGISTRY_URL}/register`, label: NAV.registerAgent, external: true },
    ],
  },
  {
    title: 'Developers',
    links: [
      { href: SPEC_URL, label: NAV.spec, external: true },
      { href: 'status.json', label: 'status.json' },
    ],
  },
  {
    title: 'Community',
    links: [
      { href: 'https://x.com/specguardxyz', label: 'X / Twitter', external: true },
      {
        href: 'https://github.com/williamsburgsh-commits/SpecGuard',
        label: 'GitHub',
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand-block">
          <div className="footer-brand">{BRAND}</div>
          <p className="footer-disclaimer">{TAGLINE}</p>
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
        © {BRAND} · Not financial advice · Onchain actions are irreversible
      </p>
    </footer>
  );
}
