import React, { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

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
    <div className="auth-theme-toggle" role="group" aria-label="Theme">
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

const AuthShell = ({ children }) => {
  return (
    <div className="auth-shell">
      <ThemeToggle />
      <aside className="auth-brand">
        <div>
          <div className="auth-brand-mark">
            <span className="auth-brand-badge">M</span>
            MyZubster
          </div>
        </div>
        <div>
          <h1 className="auth-brand-h">Your gateway to private bounties.</h1>
          <p className="auth-brand-p">
            Sign in to manage offers, track garden activity, and get paid in Monero — all from one calm, secure dashboard.
          </p>
          <ul className="auth-features" style={{ marginTop: 28 }}>
            <li><span className="dot">✓</span> End-to-end encrypted offers &amp; payouts</li>
            <li><span className="dot">✓</span> Privacy-first auth with 2FA</li>
            <li><span className="dot">✓</span> Real-time garden &amp; bounty feeds</li>
          </ul>
        </div>
        <div className="auth-brand-foot">© MyZubster Ecosystem · Community-built, open source</div>
      </aside>
      <main className="auth-form-wrap">{children}</main>
    </div>
  );
};

export default AuthShell;
