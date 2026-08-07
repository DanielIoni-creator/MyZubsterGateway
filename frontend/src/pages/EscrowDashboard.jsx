import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './EscrowDashboard.css';

const STATUS_LABELS = {
  LOCKED: 'Bloccato',
  DELIVERED: 'Consegnato',
  CONTESTED: 'In disputa',
  COMPLETED: 'Completato',
};

const EscrowDashboard = () => {
  const [escrows, setEscrows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [message, setMessage] = useState(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    jobId: '',
    clientId: '',
    robotId: '',
    amount: '',
    currency: 'MYZ',
  });

  // Dispute form state
  const [disputeJobId, setDisputeJobId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [listRes, statsRes] = await Promise.all([
        api.get('/robot/escrow/list').catch(() => ({ data: { data: [] } })),
        api.get('/robot/escrow/stats').catch(() => ({ data: { data: null } })),
      ]);
      setEscrows(listRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      console.error('Errore nel caricamento escrow:', err);
      setError('Impossibile caricare i dati. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/robot/escrow/create', createForm);
      if (res.data.success) {
        showMessage(`✅ Escrow creato per job ${createForm.jobId}`);
        setShowCreate(false);
        setCreateForm({ jobId: '', clientId: '', robotId: '', amount: '', currency: 'MYZ' });
        fetchData();
      }
    } catch (err) {
      showMessage(`❌ Errore: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleDeliver = async (jobId) => {
    try {
      const res = await api.post('/robot/escrow/deliver', { jobId });
      if (res.data.success) {
        showMessage(`✅ Job ${jobId} marcato come consegnato`);
        fetchData();
      }
    } catch (err) {
      showMessage(`❌ Errore: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!disputeJobId || !disputeReason) return;
    try {
      const res = await api.post('/robot/escrow/dispute', { jobId: disputeJobId, reason: disputeReason });
      if (res.data.success) {
        showMessage(`⚠️ Disputa aperta per job ${disputeJobId}`);
        setDisputeJobId(null);
        setDisputeReason('');
        fetchData();
      }
    } catch (err) {
      showMessage(`❌ Errore: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const exportCSV = () => {
    const headers = ['Job ID', 'Cliente', 'Robot', 'Importo', 'Valuta', 'Stato', 'Fee', 'Data creazione'];
    const rows = filteredEscrows.map(escrow => [
      escrow.jobId || 'N/A',
      escrow.clientId || 'N/A',
      escrow.robotId || 'N/A',
      escrow.amount || 0,
      escrow.currency || 'MYZ',
      escrow.status || 'N/A',
      escrow.fee || 0,
      escrow.createdAt ? new Date(escrow.createdAt).toLocaleString() : 'N/A',
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-escrow-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('📤 Report CSV esportato');
  };

  const filteredEscrows = escrows.filter(e => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (e.jobId || '').toLowerCase().includes(term) ||
             (e.clientId || '').toLowerCase().includes(term) ||
             (e.robotId || '').toLowerCase().includes(term);
    }
    return true;
  });

  const totalLocked = escrows.filter(e => e.status === 'LOCKED').reduce((s, e) => s + (e.amount || 0), 0);
  const totalCompleted = escrows.filter(e => e.status === 'COMPLETED').reduce((s, e) => s + (e.amount || 0), 0);

  if (loading) {
    return <div className="escrow-dashboard"><div className="loading">🔒 Caricamento dashboard escrow...</div></div>;
  }

  if (error && escrows.length === 0) {
    return <div className="escrow-dashboard"><div className="error-state">{error}</div></div>;
  }

  return (
    <div className="escrow-dashboard">
      <header className="dashboard-header">
        <h1>🔒 Gestione Escrow</h1>
        <p>Dashboard per monitorare e gestire gli escrow dei robot</p>
      </header>

      {message && (
        <div className={message.type === 'error' ? 'error-msg' : 'success-msg'}>
          {message.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card total">
          <div className="kpi-icon">📦</div>
          <div className="kpi-info">
            <h3>Escrow Totali</h3>
            <div className="kpi-value">{stats?.total || escrows.length}</div>
          </div>
        </div>
        <div className="kpi-card locked">
          <div className="kpi-icon">🔒</div>
          <div className="kpi-info">
            <h3>Bloccati</h3>
            <div className="kpi-value">{stats?.locked || 0}</div>
          </div>
        </div>
        <div className="kpi-card contested">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <h3>In Disputa</h3>
            <div className="kpi-value">{stats?.contested || 0}</div>
          </div>
        </div>
        <div className="kpi-card completed">
          <div className="kpi-icon">✅</div>
          <div className="kpi-info">
            <h3>Completati</h3>
            <div className="kpi-value">{stats?.completed || 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Panoramica
        </button>
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Lista Escrow
          {escrows.length > 0 && <span className="alert-badge">{escrows.length}</span>}
        </button>
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Nuovo Escrow
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 Report
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div>
            <h2>Stato Generale Escrow</h2>
            <div className="overview-grid">
              <div className="overview-item">
                <span className="overview-label">Importo bloccato</span>
                <span className="overview-value warning">{totalLocked.toFixed(2)}</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Importo completato</span>
                <span className="overview-value good">{totalCompleted.toFixed(2)}</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Fee totali</span>
                <span className="overview-value">{stats?.totalFee ? stats.totalFee.toFixed(2) : '0.00'}</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Consegnati in attesa</span>
                <span className="overview-value warning">{stats?.delivered || 0}</span>
              </div>
            </div>
            <div className="overview-grid" style={{ marginTop: 16 }}>
              <div className="overview-item">
                <span className="overview-label">Tasso completamento</span>
                <span className="overview-value good">
                  {escrows.length > 0
                    ? Math.round((escrows.filter(e => e.status === 'COMPLETED').length / escrows.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Valute supportate</span>
                <span className="overview-value">{['MYZ', 'XMR'].join(' / ')}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            <h2>📋 Lista Escrow</h2>
            <div className="filters-bar">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tutti gli stati</option>
                <option value="LOCKED">Bloccato</option>
                <option value="DELIVERED">Consegnato</option>
                <option value="CONTESTED">In disputa</option>
                <option value="COMPLETED">Completato</option>
              </select>
              <input
                type="text"
                placeholder="Cerca job / cliente / robot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {escrows.length === 0 ? (
              <div className="empty-state">
                📭 Nessun escrow registrato. Crea il primo escrow dalla tab "➕ Nuovo Escrow".
              </div>
            ) : (
              <div className="escrow-table-container">
                <table className="escrow-table">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Cliente</th>
                      <th>Robot</th>
                      <th>Importo</th>
                      <th>Valuta</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEscrows.map((escrow) => (
                      <tr key={escrow.jobId} className="clickable" onClick={() => setSelectedEscrow(escrow)}>
                        <td>{escrow.jobId}</td>
                        <td>{escrow.clientId || 'N/A'}</td>
                        <td>{escrow.robotId || 'N/A'}</td>
                        <td>{escrow.amount?.toFixed ? escrow.amount.toFixed(4) : escrow.amount}</td>
                        <td>{escrow.currency || 'MYZ'}</td>
                        <td>
                          <span className={`status-badge ${escrow.status}`}>
                            {STATUS_LABELS[escrow.status] || escrow.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {escrow.status === 'LOCKED' && (
                            <button
                              className="action-btn deliver"
                              onClick={() => handleDeliver(escrow.jobId)}
                            >
                              📦 Consegna
                            </button>
                          )}
                          {escrow.status === 'LOCKED' && (
                            <button
                              className="action-btn dispute"
                              onClick={() => setDisputeJobId(escrow.jobId)}
                            >
                              ⚠️ Disputa
                            </button>
                          )}
                          {escrow.status === 'DELIVERED' && (
                            <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>⏳ In attesa conferma</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredEscrows.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-state">Nessun escrow corrisponde ai filtri</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {disputeJobId && (
              <div className="dispute-form">
                <h3 style={{ marginTop: 0, color: '#721c24' }}>⚠️ Apri disputa per job {disputeJobId}</h3>
                <form onSubmit={handleDispute}>
                  <textarea
                    placeholder="Motivo della disputa..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    required
                  />
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button type="submit" className="action-btn dispute" style={{ fontSize: '0.9rem', padding: '10px 20px' }}>
                      Conferma disputa
                    </button>
                    <button
                      type="button"
                      className="action-btn deliver"
                      style={{ fontSize: '0.9rem', padding: '10px 20px' }}
                      onClick={() => { setDisputeJobId(null); setDisputeReason(''); }}
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <h2>➕ Nuovo Escrow</h2>
            <form className="create-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label>Job ID *</label>
                <input
                  type="text"
                  value={createForm.jobId}
                  onChange={(e) => setCreateForm({ ...createForm, jobId: e.target.value })}
                  placeholder="es. JOB-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Client ID *</label>
                <input
                  type="text"
                  value={createForm.clientId}
                  onChange={(e) => setCreateForm({ ...createForm, clientId: e.target.value })}
                  placeholder="Wallet cliente o ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Robot ID *</label>
                <input
                  type="text"
                  value={createForm.robotId}
                  onChange={(e) => setCreateForm({ ...createForm, robotId: e.target.value })}
                  placeholder="es. ROBOT-01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Importo *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="es. 100"
                  required
                />
              </div>
              <div className="form-group">
                <label>Valuta *</label>
                <select
                  value={createForm.currency}
                  onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                >
                  <option value="MYZ">MYZ</option>
                  <option value="XMR">XMR</option>
                </select>
              </div>
              <button type="submit" className="submit-btn">🔒 Crea Escrow</button>
            </form>
          </div>
        )}

        {activeTab === 'export' && (
          <div>
            <h2>📤 Report Escrow</h2>
            <div className="export-options">
              <div className="export-card" onClick={exportCSV}>
                <div className="export-icon">📊</div>
                <div className="export-info">
                  <h3>Export CSV</h3>
                  <p>Scarica tutti gli escrow in formato CSV</p>
                </div>
              </div>
              <div className="export-card">
                <div className="export-icon">📋</div>
                <div className="export-info">
                  <h3>Riepilogo Rapido</h3>
                  <p>
                    Totali: {escrows.length} | Bloccati: {stats?.locked || 0} | Completati: {stats?.completed || 0} | In disputa: {stats?.contested || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEscrow && (
        <div className="modal-overlay" onClick={() => setSelectedEscrow(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEscrow(null)}>✕</button>
            <h2>🔒 Dettaglio Escrow</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Job ID</span>
                <span className="detail-value">{selectedEscrow.jobId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Stato</span>
                <span className="detail-value">
                  <span className={`status-badge ${selectedEscrow.status}`}>
                    {STATUS_LABELS[selectedEscrow.status] || selectedEscrow.status}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cliente</span>
                <span className="detail-value">{selectedEscrow.clientId || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Robot</span>
                <span className="detail-value">{selectedEscrow.robotId || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Importo</span>
                <span className="detail-value">
                  {selectedEscrow.amount?.toFixed ? selectedEscrow.amount.toFixed(4) : selectedEscrow.amount} {selectedEscrow.currency}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fee (2%)</span>
                <span className="detail-value">
                  {selectedEscrow.fee?.toFixed ? selectedEscrow.fee.toFixed(4) : selectedEscrow.fee} {selectedEscrow.currency}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Netto</span>
                <span className="detail-value">
                  {selectedEscrow.netAmount?.toFixed ? selectedEscrow.netAmount.toFixed(4) : selectedEscrow.netAmount} {selectedEscrow.currency}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Transazione Lock</span>
                <span className="detail-value">{selectedEscrow.lockTx || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Data creazione</span>
                <span className="detail-value">
                  {selectedEscrow.createdAt ? new Date(selectedEscrow.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Scadenza</span>
                <span className="detail-value">
                  {selectedEscrow.deadline ? new Date(selectedEscrow.deadline).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedEscrow.status === 'LOCKED' && (
                <>
                  <button className="action-btn deliver" style={{ fontSize: '0.9rem', padding: '10px 20px' }} onClick={() => handleDeliver(selectedEscrow.jobId)}>
                    📦 Segna consegnato
                  </button>
                  <button className="action-btn dispute" style={{ fontSize: '0.9rem', padding: '10px 20px' }} onClick={() => { setDisputeJobId(selectedEscrow.jobId); setSelectedEscrow(null); setActiveTab('list'); }}>
                    ⚠️ Apri disputa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowDashboard;