import { useState } from 'react';

function Toggle({ on, onChange }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} onClick={onChange} aria-pressed={on} />
  );
}

export default function Settings() {
  const [s, setS] = useState({ twofa: true, iplock: false, session: true, email: true, push: false, digest: true });
  const set = (k) => setS((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="ad-section">
      <div className="settings-grid">
        <div className="glass-card">
          <div className="card-head">
            <h3>General</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '13px', color: 'var(--ad-muted)' }}>
              Site name
              <input className="ad-input" defaultValue="MyZubster Gateway" style={{ marginTop: '6px' }} />
            </label>
            <label style={{ fontSize: '13px', color: 'var(--ad-muted)' }}>
              Default currency
              <select className="ad-input" style={{ marginTop: '6px' }}>
                <option>XMR</option>
                <option>EUR</option>
                <option>USD</option>
              </select>
            </label>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-head">
            <h3>Security</h3>
          </div>
          <div className="card-body">
            <div className="set-row">
              <div className="meta">
                <b>Two-factor auth</b>
                <span>Require 2FA for admins</span>
              </div>
              <Toggle on={s.twofa} onChange={() => set('twofa')} />
            </div>
            <div className="set-row">
              <div className="meta">
                <b>IP lock</b>
                <span>Lock on suspicious IP</span>
              </div>
              <Toggle on={s.iplock} onChange={() => set('iplock')} />
            </div>
            <div className="set-row">
              <div className="meta">
                <b>Session timeout</b>
                <span>Auto logout after 30m</span>
              </div>
              <Toggle on={s.session} onChange={() => set('session')} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-head">
            <h3>Notifications</h3>
          </div>
          <div className="card-body">
            <div className="set-row">
              <div className="meta">
                <b>Email alerts</b>
                <span>Critical events</span>
              </div>
              <Toggle on={s.email} onChange={() => set('email')} />
            </div>
            <div className="set-row">
              <div className="meta">
                <b>Push notifications</b>
                <span>Real-time activity</span>
              </div>
              <Toggle on={s.push} onChange={() => set('push')} />
            </div>
            <div className="set-row">
              <div className="meta">
                <b>Weekly digest</b>
                <span>Summary every Monday</span>
              </div>
              <Toggle on={s.digest} onChange={() => set('digest')} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-head">
            <h3>Appearance</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '13.5px', color: 'var(--ad-muted)' }}>
              Theme is controlled from the top bar (Light / System / Dark) and persists across visits.
            </p>
            <button className="btn-primary magnetic" style={{ marginTop: '14px' }}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
