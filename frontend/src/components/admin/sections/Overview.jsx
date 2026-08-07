import { useEffect, useState } from 'react';
import { stats, recentActivity } from '../mockData';
import { Icon } from '../Icons';
import { StatusBadge } from '../ui';
import api from '../../utils/axiosConfig';

const spark = [40, 55, 48, 62, 58, 72, 68, 80, 76, 90];

const STATUS_LABEL = {
  PENDING: 'Pending',
  CONFIRMING: 'Confirming',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export default function Overview() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/payments', { params: { limit: 100 } })
      .then((res) => {
        if (mounted) setPayments(res?.data?.items || []);
      })
      .catch(() => {
        if (mounted) setPayments([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const completed = payments.filter((p) => p.status === 'COMPLETED');
  const totalVolume = completed.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingCount = payments.filter((p) => p.status === 'PENDING' || p.status === 'CONFIRMING').length;
  const failedCount = payments.filter((p) => p.status === 'FAILED' || p.status === 'CANCELLED' || p.status === 'EXPIRED').length;

  return (
    <div className="ad-section">
      <div className="stat-grid">
        <div className="glass-card stat-card accent-violet">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Completed Payments</span>
            <span className="dot" />
          </div>
          <div className="value">{completed.length.toLocaleString()}</div>
          <span className="delta up">▲ {payments.length ? Math.round((completed.length / payments.length) * 100) : 0}% success</span>
          <div className="spark">
            {spark.map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="glass-card stat-card accent-emerald">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Total Volume</span>
            <span className="dot" />
          </div>
          <div className="value">{totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <span className="delta up">▲ XMR / MYZ</span>
          <div className="spark">
            {spark.slice(0, 7).map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="glass-card stat-card accent-amber">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Pending</span>
            <span className="dot" />
          </div>
          <div className="value">{pendingCount}</div>
          <span className="delta down">▼ awaiting confirmation</span>
          <div className="spark">
            {spark.slice(1, 8).map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="glass-card stat-card accent-sky">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Failed</span>
            <span className="dot" />
          </div>
          <div className="value">{failedCount}</div>
          <span className="delta down">▼ requires review</span>
          <div className="spark">
            {spark.slice(2, 9).map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <div className="card-head">
            <h3>💳 Recent Payments</h3>
            <span className="hint">{loading ? 'loading…' : `live · ${payments.length} records`}</span>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                      {(p.reference || p.id || '').slice(0, 12)}
                    </td>
                    <td>
                      <b>{Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
                    </td>
                    <td>{p.currency}</td>
                    <td>
                      <StatusBadge status={(STATUS_LABEL[p.status] || p.status).toLowerCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                <span style={{ fontSize: '14px', color: 'var(--ad-muted)' }}>volume</span>
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