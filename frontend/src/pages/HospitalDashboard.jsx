import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HospitalDashboard.css';

const HospitalDashboard = () => {
  const [robotStats, setRobotStats] = useState(null);
  const [operations, setOperations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Aggiorna ogni 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, opsRes] = await Promise.all([
        axios.get('/api/robot/stats'),
        axios.get('/api/robot/jobs/history').catch(() => ({ data: { data: [] } }))
      ]);

      setRobotStats(statsRes.data.data || null);
      setOperations(opsRes.data.data || []);

      // Simula allarmi basati sui dati reali
      const simulatedAlerts = generateAlerts(statsRes.data.data);
      setAlerts(simulatedAlerts);
    } catch (err) {
      console.error('Errore nel caricamento dati:', err);
      setError('Impossibile caricare i dati. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (stats) => {
    const alerts = [];
    if (!stats) return alerts;
    if (stats.disputeCount > 0) {
      alerts.push({ type: 'warning', message: `${stats.disputeCount} robot in disputa`, time: new Date().toLocaleTimeString() });
    }
    if (stats.totalRobots > 0 && stats.activeRobots < stats.totalRobots * 0.3) {
      alerts.push({ type: 'critical', message: `Solo ${stats.activeRobots} robot attivi su ${stats.totalRobots}`, time: new Date().toLocaleTimeString() });
    }
    if (stats.averageJobs > 10) {
      alerts.push({ type: 'info', message: `Media job completati: ${stats.averageJobs.toFixed(1)}`, time: new Date().toLocaleTimeString() });
    }
    return alerts;
  };

  const exportReport = () => {
    const headers = ['Robot', 'Stato', 'Job', 'Ora Inizio', 'Ora Fine'];
    const rows = operations.map(op => [
      op.robotId || op.robotName || 'N/A',
      op.status || 'N/A',
      op.jobId || 'N/A',
      op.startTime ? new Date(op.startTime).toLocaleString() : 'N/A',
      op.endTime ? new Date(op.endTime).toLocaleString() : 'In corso'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-robot-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">🏥 Caricamento dashboard ospedaliero...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="hospital-dashboard">
      <header className="dashboard-header">
        <h1>🏥 Monitoraggio Robot Ospedaliero</h1>
        <p>Dashboard in tempo reale per il monitoraggio dei robot in ambito sanitario</p>
      </header>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card total">
          <div className="kpi-icon">🤖</div>
          <div className="kpi-info">
            <h3>Robot Totali</h3>
            <div className="kpi-value">{robotStats?.totalRobots || 0}</div>
          </div>
        </div>
        <div className="kpi-card active">
          <div className="kpi-icon">✅</div>
          <div className="kpi-info">
            <h3>Robot Attivi</h3>
            <div className="kpi-value">{robotStats?.activeRobots || 0}</div>
          </div>
        </div>
        <div className="kpi-card disputes">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <h3>In Disputa</h3>
            <div className="kpi-value">{robotStats?.disputeCount || 0}</div>
          </div>
        </div>
        <div className="kpi-card jobs">
          <div className="kpi-icon">📋</div>
          <div className="kpi-info">
            <h3>Media Job</h3>
            <div className="kpi-value">{robotStats?.averageJobs?.toFixed(1) || 0}</div>
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
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Storico Operazioni
        </button>
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Allarmi e Notifiche
          {alerts.length > 0 && <span className="alert-badge">{alerts.length}</span>}
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 Export Report
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="status-summary">
              <h2>Stato Generale</h2>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Robot operativi</span>
                  <span className="status-value good">{robotStats?.activeRobots || 0}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Job completati oggi</span>
                  <span className="status-value">{operations.filter(o => o.status === 'completed').length}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Job in corso</span>
                  <span className="status-value warning">{operations.filter(o => o.status === 'in_progress' || o.status === 'assigned').length}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Efficienza</span>
                  <span className="status-value good">
                    {operations.length > 0
                      ? Math.round((operations.filter(o => o.status === 'completed').length / operations.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h2>📜 Storico Operazioni Robot</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Robot</th>
                    <th>Job ID</th>
                    <th>Stato</th>
                    <th>Inizio</th>
                    <th>Fine</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.length > 0 ? (
                    operations.slice(0, 50).map((op, i) => (
                      <tr key={i}>
                        <td>{op.robotId || op.robotName || 'N/A'}</td>
                        <td>{op.jobId || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${op.status || 'unknown'}`}>
                            {op.status || 'sconosciuto'}
                          </span>
                        </td>
                        <td>{op.startTime ? new Date(op.startTime).toLocaleString() : 'N/A'}</td>
                        <td>{op.endTime ? new Date(op.endTime).toLocaleString() : '🔄 In corso'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">Nessuna operazione registrata</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <h2>🔔 Allarmi e Notifiche</h2>
            {alerts.length > 0 ? (
              <div className="alerts-list">
                {alerts.map((alert, i) => (
                  <div key={i} className={`alert-item ${alert.type}`}>
                    <div className="alert-icon">
                      {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="alert-body">
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-time">{alert.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">✅ Nessun allarme attivo. Tutti i robot operano regolarmente.</div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="export-section">
            <h2>📤 Esporta Report</h2>
            <div className="export-options">
              <div className="export-card" onClick={exportReport}>
                <div className="export-icon">📊</div>
                <div className="export-info">
                  <h3>Export CSV</h3>
                  <p>Scarica lo storico operazioni in formato CSV</p>
                </div>
              </div>
              <div className="export-card">
                <div className="export-icon">📋</div>
                <div className="export-info">
                  <h3>Riepilogo Rapido</h3>
                  <p>
                    Robot attivi: {robotStats?.activeRobots || 0} / {robotStats?.totalRobots || 0} |
                    Job completati: {operations.filter(o => o.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;
