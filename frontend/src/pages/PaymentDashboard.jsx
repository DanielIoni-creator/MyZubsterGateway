import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PaymentDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const STATUS_COLORS = {
  PENDING: '#f39c12',
  CONFIRMING: '#3498db',
  COMPLETED: '#2ecc71',
  FAILED: '#e74c3c',
  CANCELLED: '#95a5a6',
  EXPIRED: '#e67e22'
};

const STATUS_LABELS = {
  PENDING: 'In attesa',
  CONFIRMING: 'In conferma',
  COMPLETED: 'Completato',
  FAILED: 'Fallito',
  CANCELLED: 'Annullato',
  EXPIRED: 'Scaduto'
};

const PaymentDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [xmrRate, setXmrRate] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/payments`);
      const items = res.data?.items || [];
      setPayments(items);
      setError(null);
    } catch (err) {
      setError('Errore nel caricamento dei pagamenti: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchXmrRate = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/xmr/rate`);
      setXmrRate(res.data?.data || null);
    } catch (err) {
      // Rate is optional — silently ignore
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchXmrRate();
    const interval = setInterval(() => {
      fetchPayments();
      fetchXmrRate();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPayments, fetchXmrRate]);

  // Compute stats
  const stats = {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    byStatus: payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}),
    amountByStatus: payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + (p.amount || 0);
      return acc;
    }, {})
  };

  // Filter payments
  let filteredPayments = payments;
  if (statusFilter !== 'ALL') {
    filteredPayments = filteredPayments.filter(p => p.status === statusFilter);
  }
  if (dateRange.from) {
    filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) >= new Date(dateRange.from));
  }
  if (dateRange.to) {
    filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) <= new Date(dateRange.to + 'T23:59:59'));
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredPayments = filteredPayments.filter(p =>
      (p.id && p.id.toLowerCase().includes(term)) ||
      (p.userId && p.userId.toLowerCase().includes(term)) ||
      (p.reference && p.reference.toLowerCase().includes(term)) ||
      p.currency?.toLowerCase().includes(term)
    );
  }

  // Sort newest first
  filteredPayments = [...filteredPayments].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const exportCSV = () => {
    const headers = ['ID', 'User ID', 'Amount', 'Currency', 'Status', 'TX ID', 'Reference', 'Created'];
    const rows = filteredPayments.map(p => [
      p.id, p.userId, p.amount, p.currency, p.status, p.txId || '', p.reference || '', p.createdAt
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pagamenti-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (paymentId, newStatus) => {
    try {
      await axios.post(`${API_BASE}/api/payments/${paymentId}/status`, { status: newStatus });
      fetchPayments();
    } catch (err) {
      setError('Errore aggiornamento status: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="loading">💰 Caricamento pagamenti...</div>;
  }

  return (
    <div className="payment-dashboard">
      <header className="payment-dashboard-header">
        <h1>💰 Monitoraggio Pagamenti</h1>
        <p>Dashboard in tempo reale per pagamenti MYZ e XMR</p>
        {xmrRate && (
          <div className="xmr-rate-badge">
            <span>1 XMR = {xmrRate.usd?.toFixed(2) || '--'}$ USD</span>
          </div>
        )}
      </header>

      {error && (
        <div className="payment-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="payment-stats-grid">
        <div className="payment-stat-card total">
          <h3>Totale</h3>
          <div className="value">{stats.total}</div>
          <div className="sub">{stats.totalAmount.toFixed(2)} MYZ/XMR</div>
        </div>
        <div className="payment-stat-card pending">
          <h3>In attesa</h3>
          <div className="value">{stats.byStatus.PENDING || 0}</div>
          <div className="sub">{(stats.amountByStatus.PENDING || 0).toFixed(2)}</div>
        </div>
        <div className="payment-stat-card confirming">
          <h3>In conferma</h3>
          <div className="value">{stats.byStatus.CONFIRMING || 0}</div>
          <div className="sub">{(stats.amountByStatus.CONFIRMING || 0).toFixed(2)}</div>
        </div>
        <div className="payment-stat-card completed">
          <h3>Completati</h3>
          <div className="value">{stats.byStatus.COMPLETED || 0}</div>
          <div className="sub">{(stats.amountByStatus.COMPLETED || 0).toFixed(2)}</div>
        </div>
        <div className="payment-stat-card failed">
          <h3>Falliti</h3>
          <div className="value">{(stats.byStatus.FAILED || 0) + (stats.byStatus.CANCELLED || 0) + (stats.byStatus.EXPIRED || 0)}</div>
          <div className="sub">{(stats.amountByStatus.FAILED || 0) + (stats.amountByStatus.CANCELLED || 0) + (stats.amountByStatus.EXPIRED || 0)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="payment-filters">
        <div className="filter-group">
          <label>Stato</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">Tutti</option>
            {Object.keys(STATUS_COLORS).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Da</label>
          <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
        </div>
        <div className="filter-group">
          <label>A</label>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
        </div>
        <div className="filter-group">
          <label>Cerca</label>
          <input type="text" placeholder="ID, utente, riferimento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button className="btn-export" onClick={exportCSV}>
          📥 Esporta CSV
        </button>
        <button className="btn-refresh" onClick={() => { setLoading(true); fetchPayments(); fetchXmrRate(); }}>
          🔄 Aggiorna
        </button>
      </div>

      {/* Payment Table */}
      <div className="payment-table-section">
        <h2>📋 Transazioni ({filteredPayments.length})</h2>
        <div className="payment-table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Utente</th>
                <th>Importo</th>
                <th>Valuta</th>
                <th>Stato</th>
                <th>TX ID</th>
                <th>Riferimento</th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-row">Nessun pagamento trovato</td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="cell-id" title={payment.id}>{payment.id?.slice(0, 12)}...</td>
                    <td className="cell-user" title={payment.userId}>{payment.userId?.slice(0, 10)}...</td>
                    <td className="cell-amount">{payment.amount?.toFixed(2)}</td>
                    <td><span className="currency-badge">{payment.currency}</span></td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: STATUS_COLORS[payment.status] || '#95a5a6' }}
                      >
                        {STATUS_LABELS[payment.status] || payment.status}
                      </span>
                    </td>
                    <td className="cell-txid" title={payment.txId}>{payment.txId ? payment.txId.slice(0, 12) + '...' : '-'}</td>
                    <td>{payment.reference || '-'}</td>
                    <td className="cell-date">{new Date(payment.createdAt).toLocaleString()}</td>
                    <td className="cell-actions">
                      {payment.status === 'PENDING' && (
                        <button className="btn-action confirm" onClick={() => updateStatus(payment.id, 'CONFIRMING')} title="Conferma">
                          ✓
                        </button>
                      )}
                      {payment.status === 'CONFIRMING' && (
                        <button className="btn-action complete" onClick={() => updateStatus(payment.id, 'COMPLETED')} title="Completa">
                          ✓
                        </button>
                      )}
                      {(payment.status === 'PENDING' || payment.status === 'CONFIRMING') && (
                        <button className="btn-action cancel" onClick={() => updateStatus(payment.id, 'CANCELLED')} title="Annulla">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="payment-alerts-section">
        <h2>🔔 Allarmi Automatici</h2>
        <div className="alerts-grid">
          <div className="alert-card warning">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Pagamenti in attesa</strong>
              <p>{stats.byStatus.PENDING || 0} pagamenti da confermare</p>
            </div>
          </div>
          <div className="alert-card danger">
            <span className="alert-icon">❌</span>
            <div className="alert-content">
              <strong>Pagamenti falliti</strong>
              <p>{(stats.byStatus.FAILED || 0) + (stats.byStatus.CANCELLED || 0) + (stats.byStatus.EXPIRED || 0)} pagamenti non riusciti</p>
            </div>
          </div>
          <div className="alert-card success">
            <span className="alert-icon">✅</span>
            <div className="alert-content">
              <strong>Completati oggi</strong>
              <p>{payments.filter(p => p.status === 'COMPLETED' && new Date(p.createdAt).toDateString() === new Date().toDateString()).length} pagamenti</p>
            </div>
          </div>
          <div className="alert-card info">
            <span className="alert-icon">📊</span>
            <div className="alert-content">
              <strong>Volume totale</strong>
              <p>{stats.totalAmount.toFixed(2)} MYZ/XMR processati</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;