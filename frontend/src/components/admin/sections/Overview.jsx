import { stats, recentActivity } from '../mockData';
import { Icon } from '../Icons';
import { StatusBadge } from '../ui';

const spark = [40, 55, 48, 62, 58, 72, 68, 80, 76, 90];

export default function Overview() {
  return (
    <div className="ad-section">
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.id} className={`glass-card stat-card accent-${s.accent}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">{s.label}</span>
              <span className="dot" />
            </div>
            <div className="value">{s.value}</div>
            <span className={`delta ${s.trend}`}>{s.trend === 'up' ? '▲' : '▼'} {s.delta}</span>
            <div className="spark">
              {spark.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <div className="card-head">
            <h3>🌿 Garden Activity</h3>
            <span className="hint">Live · last 2h</span>
          </div>
          <div className="card-body">
            <div className="feed">
              {recentActivity.map((a) => {
                const Ic = Icon[a.type.charAt(0).toUpperCase() + a.type.slice(1)] || Icon.Plant;
                return (
                  <div className="feed-item" key={a.id}>
                    <div className={`feed-ic ${a.type}`}>
                      <Ic width={18} height={18} />
                    </div>
                    <div>
                      <div className="txt">
                        <b>{a.user}</b> {a.action} <b>{a.target}</b>
                      </div>
                      <div className="time">{a.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="glass-card">
            <div className="card-head">
              <h3>XMR Volume</h3>
              <span className="hint">7d</span>
            </div>
            <div className="card-body">
              <div style={{ fontSize: '26px', fontWeight: 700 }}>
                1,204.6 <span style={{ fontSize: '14px', color: 'var(--ad-muted)' }}>XMR</span>
              </div>
              <div className="spark" style={{ height: '60px', marginTop: '12px' }}>
                {[30, 45, 38, 60, 52, 72, 68].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="glass-card">
            <div className="card-head">
              <h3>System Status</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ad-muted)' }}>Gateway</span>
                <StatusBadge status="active" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ad-muted)' }}>Monero node</span>
                <StatusBadge status="active" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ad-muted)' }}>DB (MongoDB)</span>
                <StatusBadge status="active" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
