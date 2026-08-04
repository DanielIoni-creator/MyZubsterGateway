import { bounties } from '../mockData';
import { StatusBadge } from '../ui';

export default function Bounties() {
  return (
    <div className="ad-section">
      <div className="bounty-grid">
        {bounties.map((b) => (
          <div key={b.id} className="glass-card bounty-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="rid">{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="rtitle">{b.title}</div>
            <div className="rmeta">
              <span className="hint" style={{ fontSize: '12px', color: 'var(--ad-muted)' }}>
                {b.type}
              </span>
              <span className="bounty-reward">{b.reward}</span>
            </div>
            <button className="btn-ghost" style={{ width: '100%' }}>
              {b.claimed ? 'View submission' : 'Claim'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
