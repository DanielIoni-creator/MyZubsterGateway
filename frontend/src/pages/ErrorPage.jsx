import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import './errors.css';

/* ---------- theme toggle (consistent with AuthShell) ---------- */
const Sun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
  </svg>
);
const Monitor = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const ThemeToggle = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const opts = [
    { key: 'light', icon: <Sun />, label: 'Light' },
    { key: 'dark', icon: <Moon />, label: 'Dark' },
    { key: 'system', icon: <Monitor />, label: 'System' },
  ];
  return (
    <div className="error-theme-toggle" role="group" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          className={theme === o.key ? 'active' : ''}
          onClick={() => setTheme(o.key)}
          aria-label={o.label}
          aria-pressed={theme === o.key}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
};

/* ---------- illustrations (theme-aware via var(--ad-*)) ---------- */
const I404 = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <circle cx="86" cy="74" r="42" stroke="var(--ad-accent)" strokeWidth="6" opacity="0.9" />
    <circle cx="86" cy="74" r="20" stroke="var(--ad-accent-2)" strokeWidth="5" opacity="0.7" />
    <line x1="118" y1="106" x2="158" y2="146" stroke="var(--ad-accent)" strokeWidth="8" strokeLinecap="round" />
    <path d="M150 40 q14 -18 30 -6 q12 10 -2 22" stroke="var(--ad-muted)" strokeWidth="4" strokeLinecap="round" />
    <circle cx="180" cy="56" r="3.5" fill="var(--ad-accent-2)" />
    <path d="M40 132 q22 -14 44 0 t44 0" stroke="var(--ad-border)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
  </svg>
);
const I500 = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <rect x="44" y="44" width="132" height="86" rx="14" stroke="var(--ad-accent)" strokeWidth="6" opacity="0.9" />
    <path d="M44 92 l30 22 26 -30 28 34 26 -26 22 18" stroke="var(--ad-accent-2)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M120 44 l-14 40 26 4 -10 40" stroke="var(--ad-muted)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="170" cy="58" r="6" fill="var(--ad-accent-2)" />
  </svg>
);
const I403 = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <path d="M110 36 l52 20 v34 c0 34 -24 56 -52 64 c-28 -8 -52 -30 -52 -64 v-34 z" stroke="var(--ad-accent)" strokeWidth="6" opacity="0.9" />
    <circle cx="110" cy="86" r="14" stroke="var(--ad-accent-2)" strokeWidth="5" />
    <path d="M110 72 v14" stroke="var(--ad-accent-2)" strokeWidth="5" strokeLinecap="round" />
    <line x1="74" y1="42" x2="146" y2="128" stroke="var(--ad-muted)" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
const IRate = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <path d="M60 120 a50 50 0 1 1 100 0 z" stroke="var(--ad-accent)" strokeWidth="6" opacity="0.9" />
    <line x1="110" y1="120" x2="110" y2="82" stroke="var(--ad-accent-2)" strokeWidth="6" strokeLinecap="round" />
    <line x1="110" y1="120" x2="142" y2="120" stroke="var(--ad-accent-2)" strokeWidth="6" strokeLinecap="round" />
    <circle cx="110" cy="120" r="6" fill="var(--ad-accent-2)" />
    <path d="M150 44 q14 -18 30 -6 q12 10 -2 22" stroke="var(--ad-muted)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
const IMaintenance = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <circle cx="96" cy="88" r="44" stroke="var(--ad-accent)" strokeWidth="6" opacity="0.9" />
    <path d="M96 60 v28 l20 12" stroke="var(--ad-accent-2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="138" y="96" width="44" height="22" rx="6" transform="rotate(45 160 107)" stroke="var(--ad-muted)" strokeWidth="5" />
  </svg>
);
const IOffline = () => (
  <svg className="illu-svg" viewBox="0 0 220 170" fill="none">
    <path d="M70 70 a44 44 0 0 1 80 0" stroke="var(--ad-accent)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
    <path d="M88 88 a22 22 0 0 1 44 0" stroke="var(--ad-accent-2)" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
    <circle cx="110" cy="108" r="5" fill="var(--ad-accent-2)" />
    <line x1="50" y1="46" x2="170" y2="132" stroke="var(--ad-muted)" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

/* ---------- per-type config ---------- */
const CONFIG = {
  '404': {
    code: '404',
    title: 'Page not found',
    sub: 'The page you are looking for drifted off the map. It may have moved, or the link is just stale.',
    illu: <I404 />,
    actions: [
      { to: '/', label: 'Back to home', primary: true },
      { to: '/dashboard', label: 'Go to dashboard' },
    ],
  },
  '500': {
    code: '500',
    title: 'Something broke on our end',
    sub: 'An unexpected error occurred while processing your request. Our team has been notified — please try again shortly.',
    illu: <I500 />,
    actions: [
      { to: '/', label: 'Back to home', primary: true },
      { href: 'mailto:support@myzubster.example', label: 'Contact support' },
    ],
  },
  '403': {
    code: '403',
    title: 'Access forbidden',
    sub: 'You need to sign in to view this resource. If you already have an account, just log in to continue.',
    illu: <I403 />,
    actions: [
      { to: '/login', label: 'Log in', primary: true },
      { to: '/', label: 'Back to home' },
    ],
  },
  'rate': {
    code: '429',
    title: 'Rate limit reached',
    sub: 'Too many requests in a short time. Take a breath — access unlocks automatically in a moment.',
    illu: <IRate />,
    note: true,
    actions: [{ to: '/', label: 'Back to home', primary: true }],
  },
  'maintenance': {
    code: '503',
    title: 'Under maintenance',
    sub: 'MyZubster is briefly offline for scheduled upgrades. We are making things faster and safer for you.',
    illu: <IMaintenance />,
    note: true,
    actions: [{ to: '/', label: 'Back to home', primary: true }],
  },
  'offline': {
    code: 'OFFLINE',
    title: "You're offline",
    sub: "We can't reach the server. Check your connection and we'll get you right back.",
    illu: <IOffline />,
    actions: [{ to: '/', label: 'Retry', primary: true }],
  },
};

const ErrorPage = ({ type = '404' }) => {
  const cfg = CONFIG[type] || CONFIG['404'];
  const [secs, setSecs] = useState(60);

  useEffect(() => {
    if (type !== 'rate') return;
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, type]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="error-shell">
      <ThemeToggle />
      <div className="error-card">
        <div className="error-illu">{cfg.illu}</div>
        <div className="error-code">{cfg.code}</div>
        <h1 className="error-title">{cfg.title}</h1>
        <p className="error-sub">{cfg.sub}</p>

        {cfg.note && type === 'rate' && (
          <div className="error-note">Available again in <b>{fmt(secs)}</b></div>
        )}
        {cfg.note && type === 'maintenance' && (
          <div className="error-note">Estimated downtime: <b>~30 min</b></div>
        )}

        <div className="error-actions">
          {cfg.actions.map((a) =>
            a.href ? (
              <a key={a.label} className="error-btn error-btn-ghost" href={a.href}>{a.label}</a>
            ) : (
              <Link key={a.label} className={`error-btn ${a.primary ? 'error-btn-primary' : 'error-btn-ghost'}`} to={a.to}>{a.label}</Link>
            )
          )}
        </div>
      </div>
      <div className="error-foot">© MyZubster Ecosystem · Community-built, open source</div>
    </div>
  );
};

export default ErrorPage;
