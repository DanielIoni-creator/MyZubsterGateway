import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './TransactionHistory.css';

const STATUS_MAP = {
  PENDING: { label: 'In attesa', color: '#f39c12' },
  CONFIRMING: { label: 'In conferma', color: '#3498db' },
  COMPLETED: { label: 'Completato', color: '#2ecc71' },
  FAILED: { label: 'Fallito', color: '#e74c3c' },
  CANCELLED: { label: 'Annullato', color: '#95a5a6' },
  EXPIRED: { label: 'Scaduto', color: '#7f8c8d' },
};

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    currency: '',
    from: '',
    to: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: pagination.limit, offset: pagination.offset };
      if (filters.status) params.status = filters.status;
      if (filters.currency) params.currency = filters.currency;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await api.get('/payments', { params });
      const data = res.data;

      let items = data.items || [];
      // Client-side search filter
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (t) =>
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.userId && t.userId.toLowerCase().includes(q)) ||
            (t.reference && t.reference.toLowerCase().includes(q)) ||
            (t.txId && t.txId.toLowerCase().includes(q))
        );
      }

      setTransactions(items);
      setPagination((prev) => ({ ...prev, total: data.total || items.length }));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Errore nel caricamento delle transazioni. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const resetFilters = () => {
    setFilters({ status: '', currency: '', from: '', to: '', search: '' });
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Utente', 'Importo', 'Valuta', 'Stato', 'Riferimento', 'TX ID', 'Data'];
    const rows = transactions.map((t) => [
      t.id,
      t.userId,
      t.amount,
      t.currency,
      STATUS_MAP[t.status]?.label || t.status,
      t.reference || '',
      t.txId || '',
      t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transazioni_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Simple print-friendly version
    window.print();
  };

  const openDetail = (tx) => {
    setDetail(tx);
  };

  const closeDetail = () => {
    setDetail(null);
  };

  const formatAmount = (amount, currency) => {
    const num = Number(amount) || 0;
    return currency === 'XMR' ? num.toFixed(6) : num.toFixed(0);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="transaction-history">
        <div className="loading">⏳ Caricamento transazioni...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transaction-history">
        <div className="error-message">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <header className="history-header">
        <h1>📊 Storico Transazioni</h1>
        <p>Visualizza, filtra ed esporta le tue transazioni</p>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Stato</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">Tutti</option>
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Valuta</label>
          <select
            value={filters.currency}
            onChange={(e) => handleFilterChange('currency', e.target.value)}
          >
            <option value="">Tutte</option>
            <option value="MYZ">MYZ</option>
            <option value="XMR">XMR</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Da</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>A</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
          />
        </div>

        <div className="filter-group search-group">
          <label>Ricerca</label>
          <input
            type="text"
            placeholder="Cerca per ID, utente, riferimento..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button className="btn-reset" onClick={resetFilters}>
            🔄 Reset
          </button>
          <button className="btn-export" onClick={handleExportCSV}>
            📥 CSV
          </button>
          <button className="btn-export btn-export-pdf" onClick={handleExportPDF}>
            🖨️ Stampa/PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-bar">
        <span>
          <strong>{pagination.total}</strong> transazioni trovate
        </span>
        <span className="summary-myzbudget">
          Budget MYZ:{' '}
          {formatAmount(
            transactions.filter((t) => t.currency === 'MYZ' && t.status === 'COMPLETED').reduce((s, t) => s + (t.amount || 0), 0),
            'MYZ'
          )}{' '}
          MYZ
        </span>
        <span className="summary-xmrbudget">
          Budget XMR:{' '}
          {formatAmount(
            transactions.filter((t) => t.currency === 'XMR' && t.status === 'COMPLETED').reduce((s, t) => s + (t.amount || 0), 0),
            'XMR'
          )}{' '}
          XMR
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="tx-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Utente</th>
              <th>Importo</th>
              <th>Valuta</th>
              <th>Stato</th>
              <th>Riferimento</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  Nessuna transazione trovata
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="tx-row">
                  <td className="tx-id" title={tx.id}>
                    {tx.id.length > 12 ? tx.id.slice(0, 12) + '...' : tx.id}
                  </td>
                  <td className="tx-user">{tx.userId}</td>
                  <td className="tx-amount">
                    <span className={tx.currency === 'XMR' ? 'amount-xmr' : 'amount-myz'}>
                      {formatAmount(tx.amount, tx.currency)} {tx.currency}
                    </span>
                  </td>
                  <td>
                    <span className={`currency-badge ${tx.currency?.toLowerCase()}`}>
                      {tx.currency}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: STATUS_MAP[tx.status]?.color || '#95a5a6' }}
                    >
                      {STATUS_MAP[tx.status]?.label || tx.status}
                    </span>
                  </td>
                  <td className="tx-reference">{tx.reference || '—'}</td>
                  <td className="tx-date">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button className="btn-detail" onClick={() => openDetail(tx)}>
                      👁️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading overlay */}
      {loading && <div className="loading-overlay">⏳ Aggiornamento...</div>}

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetail}>
              ✕
            </button>
            <h2>Dettaglio Transazione</h2>
            <div className="detail-grid">
              <div className="detail-field">
                <label>ID</label>
                <span className="mono">{detail.id}</span>
              </div>
              <div className="detail-field">
                <label>Utente</label>
                <span>{detail.userId}</span>
              </div>
              <div className="detail-field">
                <label>Importo</label>
                <span className={detail.currency === 'XMR' ? 'amount-xmr' : 'amount-myz'}>
                  {formatAmount(detail.amount, detail.currency)} {detail.currency}
                </span>
              </div>
              <div className="detail-field">
                <label>Stato</label>
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_MAP[detail.status]?.color || '#95a5a6' }}
                >
                  {STATUS_MAP[detail.status]?.label || detail.status}
                </span>
              </div>
              <div className="detail-field">
                <label>Riferimento</label>
                <span>{detail.reference || '—'}</span>
              </div>
              <div className="detail-field">
                <label>TX ID</label>
                <span className="mono">{detail.txId || '—'}</span>
              </div>
              <div className="detail-field">
                <label>Conferme</label>
                <span>{detail.confirmations ?? '—'}</span>
              </div>
              <div className="detail-field">
                <label>Creata</label>
                <span>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</span>
              </div>
              <div className="detail-field">
                <label>Aggiornata</label>
                <span>{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '—'}</span>
              </div>
              {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                <div className="detail-field full-width">
                  <label>Metadati</label>
                  <pre className="metadata-json">{JSON.stringify(detail.metadata, null, 2)}</pre>
                </div>
              )}
              {detail.audit && detail.audit.length > 0 && (
                <div className="detail-field full-width">
                  <label>Audit Log</label>
                  <div className="audit-list">
                    {detail.audit.map((entry, i) => (
                      <div key={i} className="audit-entry">
                        <span className="audit-status">{entry.status}</span>
                        <span className="audit-time">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
                        {entry.reason && <span className="audit-reason">— {entry.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;