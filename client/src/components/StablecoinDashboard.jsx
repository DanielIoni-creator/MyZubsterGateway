import React, { useState, useEffect } from 'react';
import './StablecoinDashboard.css';

function StablecoinDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/stablecoin/dashboard');
      const data = await res.json();
      setDashboard(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="sc-loading">Caricamento dashboard...</div>;
  if (error) return <div className="sc-error">Errore: {error}</div>;
  if (!dashboard) return null;

  return (
    <div className="stablecoin-dashboard">
      <h2>Dashboard Stablecoin</h2>
      <div className="sc-metrics">
        <div className="sc-card">
          <span className="sc-label">Totale Pagamenti</span>
          <span className="sc-value">{dashboard.totalPayments}</span>
        </div>
        <div className="sc-card">
          <span className="sc-label">Volume 24h</span>
          <span className="sc-value">{dashboard.recentVolume.toFixed(2)}</span>
        </div>
      </div>
      <div className="sc-breakdown">
        <h3>Per Valuta</h3>
        <table>
          <thead><tr><th>Valuta</th><th>Transazioni</th><th>Volume</th></tr></thead>
          <tbody>
            {dashboard.byCurrency?.map(c => (
              <tr key={c._id}>
                <td>{c._id}</td><td>{c.count}</td><td>{c.volume.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sc-breakdown">
        <h3>Per Stato</h3>
        <table>
          <thead><tr><th>Stato</th><th>Conteggio</th></tr></thead>
          <tbody>
            {dashboard.byStatus?.map(s => (
              <tr key={s._id}>
                <td><span className={`sc-status sc-${s._id}`}>{s._id}</span></td>
                <td>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sc-updated">Aggiornato: {new Date(dashboard.updatedAt).toLocaleString('it-IT')}</div>
    </div>
  );
}

export default StablecoinDashboard;
