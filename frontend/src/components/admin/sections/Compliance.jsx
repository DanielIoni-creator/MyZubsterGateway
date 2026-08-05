import { useState } from 'react';
import { complianceStats, complianceWallets, suspiciousTransactions, complianceAlerts } from '../mockData';
import { Icon } from '../Icons';
import { StatusBadge } from '../ui';

const riskColors = {
  low: '#059669',
  medium: '#d97706',
  high: '#dc2626',
};

const severityMap = {
  critical: { label: 'Critical', cls: 'lvl-error' },
  warning: { label: 'Warning', cls: 'lvl-warn' },
  info: { label: 'Info', cls: 'lvl-info' },
};

function KYCStatus({ status }) {
  const map = {
    verified: { label: 'Verified', cls: 'b-active' },
    pending: { label: 'Pending', cls: 'b-pending' },
    suspended: { label: 'Suspended', cls: 'b-suspended' },
  };
  const s = map[status] || map.pending;
  return <span className={'badge ' + s.cls}>{s.label}</span>;
}

export default function Compliance() {
  const [walletFilter, setWalletFilter] = useState('all');
  const [txFilter, setTxFilter] = useState('all');

  const filteredWallets = walletFilter === 'all'
    ? complianceWallets
    : complianceWallets.filter(w => w.kyc === walletFilter);

  const filteredTx = txFilter === 'all'
    ? suspiciousTransactions
    : suspiciousTransactions.filter(t => t.status === txFilter);

  return (
    <div className="ad-section">
      <div className="stat-grid">
        {complianceStats.map((s) => (
          <div key={s.id} className={'glass-card stat-card accent-' + s.accent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">{s.label}</span>
              <span className="dot" />
            </div>
            <div className="value">{s.value}</div>
            <span className={'delta ' + s.trend}>
              {s.trend === 'up' ? '\u25B2' : '\u25BC'} {s.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <div className="card-head">
            <h3><Icon.Shield width={16} height={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Wallet KYC Status</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'verified', 'pending', 'suspended'].map(f => (
                <button key={f} className={'log-chip' + (walletFilter === f ? ' active' : '')} onClick={() => setWalletFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Holder</th>
                  <th>Wallet</th>
                  <th>Type</th>
                  <th>KYC</th>
                  <th>Country</th>
                  <th>Volume (MYZ)</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map(w => (
                  <tr key={w.id}>
                    <td><div style={{ fontWeight: 600 }}>{w.holder}</div></td>
                    <td><code style={{ fontSize: 12, color: 'var(--ad-muted)' }}>{w.address}</code></td>
                    <td style={{ textTransform: 'capitalize' }}>{w.type}</td>
                    <td><KYCStatus status={w.kyc} /></td>
                    <td>{w.country}</td>
                    <td>{w.volume}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: riskColors[w.risk], fontWeight: 600, fontSize: 13 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColors[w.risk] }} />
                        {w.risk.charAt(0).toUpperCase() + w.risk.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="glass-card">
            <div className="card-head">
              <h3><Icon.AlertTriangle width={16} height={16} style={{ marginRight: 6, verticalAlign: -2, color: '#dc2626' }} /> Active Alerts</h3>
              <span className="hint">{complianceAlerts.length} active</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {complianceAlerts.map(a => (
                <div key={a.id} className="log-row" style={{ gridTemplateColumns: '70px 1fr 90px', padding: '10px 16px' }}>
                  <span className={'lvl ' + (severityMap[a.severity]?.cls || 'lvl-info')}>{a.severity}</span>
                  <span style={{ fontSize: 13 }}>{a.message}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ad-muted)', textAlign: 'right' }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary magnetic" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon.Download width={16} height={16} /> Export CSV
            </button>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon.FileText width={16} height={16} /> Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h3><Icon.Flag width={16} height={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Suspicious Transactions</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'pending', 'investigating', 'cleared'].map(f => (
              <button key={f} className={'log-chip' + (txFilter === f ? ' active' : '')} onClick={() => setTxFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>Holder</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Detected</th>
                <th>Risk</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id}>
                  <td><code style={{ fontSize: 12, color: 'var(--ad-muted)' }}>{tx.id}</code></td>
                  <td style={{ fontWeight: 600 }}>{tx.holder}</td>
                  <td>{tx.amount}</td>
                  <td style={{ textTransform: 'capitalize' }}>{tx.type.replace(/-/g, ' ')}</td>
                  <td style={{ fontSize: 12.5 }}>{tx.detected}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: riskColors[tx.risk], fontWeight: 600, fontSize: 13 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColors[tx.risk] }} />
                      {tx.risk.charAt(0).toUpperCase() + tx.risk.slice(1)}
                    </span>
                  </td>
                  <td><StatusBadge status={tx.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}