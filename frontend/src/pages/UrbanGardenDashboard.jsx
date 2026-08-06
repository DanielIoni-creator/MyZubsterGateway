import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import LineChart from '../components/LineChart';
import './UrbanGardenDashboard.css';

const UrbanGardenDashboard = () => {
  const [gardenData, setGardenData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gardenId, setGardenId] = useState('orto-rimini-001');
  const [dateRange, setDateRange] = useState('24h');
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [historyRes, latestRes, statsRes] = await Promise.all([
        axios.get(`/api/sensors/garden/${gardenId}?range=${dateRange}`),
        axios.get(`/api/sensors/garden/${gardenId}/latest`),
        axios.get(`/api/sensors/garden/${gardenId}/stats?range=${dateRange}`)
      ]);

      const history = historyRes.data.data || [];
      setGardenData(history);
      setLatestData(latestRes.data.data || null);
      setStats(statsRes.data.data || null);
    } catch (err) {
      console.error('Error fetching garden data:', err);
      setError(err.response?.data?.message || err.message || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [gardenId, dateRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /** Export data as CSV file */
  const exportCSV = () => {
    if (!gardenData.length) return;

    const headers = ['Data/Ora', 'pH', 'EC', 'Temperatura (°C)', 'Umidità (%)'];
    const rows = gardenData.map(r => [
      new Date(r.timestamp).toISOString(),
      r.ph,
      r.ec,
      r.temperature,
      r.humidity
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orto-${gardenId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /** Get status color based on value */
  const getStatusColor = (value, type) => {
    const ranges = {
      ph: { min: 6.0, max: 7.5 },
      ec: { min: 0.8, max: 2.0 },
      temperature: { min: 15, max: 25 },
      humidity: { min: 40, max: 70 }
    };
    const r = ranges[type];
    if (!r || value == null) return '';
    return value < r.min || value > r.max ? 'status-warning' : 'status-ok';
  };

  if (loading && gardenData.length === 0) {
    return <div className="loading" role="status">🌱 Caricamento dati orto...</div>;
  }

  const chartData = (key) =>
    gardenData.map(d => ({ value: parseFloat(d[key]) || 0, timestamp: d.timestamp }));

  return (
    <div className="urban-garden-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>🌱 Orto Urbano — Rimini</h1>
            <p className="header-subtitle">Monitoraggio in tempo reale dei parametri del suolo</p>
          </div>
          <div className="header-actions">
            <select
              className="garden-select"
              value={gardenId}
              onChange={e => setGardenId(e.target.value)}
              aria-label="Seleziona orto"
            >
              <option value="orto-rimini-001">Orto Rimini — Zona 1</option>
              <option value="orto-rimini-002">Orto Rimini — Zona 2</option>
              <option value="orto-bologna-001">Orto Bologna — Centro</option>
            </select>
            <select
              className="range-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              aria-label="Intervallo dati"
            >
              <option value="24h">Ultime 24 ore</option>
              <option value="7d">Ultimi 7 giorni</option>
              <option value="30d">Ultimi 30 giorni</option>
            </select>
            <button
              className="btn-refresh"
              onClick={fetchData}
              disabled={loading}
              aria-label="Aggiorna dati"
            >
              {loading ? '🔄' : '🔄 Aggiorna'}
            </button>
            <button
              className="btn-export"
              onClick={exportCSV}
              disabled={!gardenData.length}
              aria-label="Esporta CSV"
            >
              📥 Esporta CSV
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className={`stat-card ph ${getStatusColor(latestData?.ph, 'ph')}`}>
          <h3>pH</h3>
          <div className="value">{latestData?.ph != null ? latestData.ph.toFixed(1) : '--'}</div>
          <div className="range">6.0 – 7.5 (ottimale)</div>
          <div className="status-indicator">
            {latestData?.ph != null && (latestData.ph < 6.0 ? '⬇️ Acido' : latestData.ph > 7.5 ? '⬆️ Basico' : '✅ Ottimale')}
          </div>
        </div>

        <div className={`stat-card ec ${getStatusColor(latestData?.ec, 'ec')}`}>
          <h3>EC (Conducibilità)</h3>
          <div className="value">{latestData?.ec != null ? latestData.ec.toFixed(2) : '--'}</div>
          <div className="range">0.8 – 2.0 mS/cm (ottimale)</div>
          <div className="status-indicator">
            {latestData?.ec != null && (latestData.ec < 0.8 ? '⬇️ Bassa' : latestData.ec > 2.0 ? '⬆️ Alta' : '✅ Ottimale')}
          </div>
        </div>

        <div className={`stat-card temperature ${getStatusColor(latestData?.temperature, 'temperature')}`}>
          <h3>🌡️ Temperatura</h3>
          <div className="value">{latestData?.temperature != null ? `${latestData.temperature.toFixed(1)}°C` : '--'}</div>
          <div className="range">15 – 25 °C (ottimale)</div>
          <div className="status-indicator">
            {latestData?.temperature != null && (latestData.temperature < 15 ? '⬇️ Freddo' : latestData.temperature > 25 ? '⬆️ Caldo' : '✅ Ottimale')}
          </div>
        </div>

        <div className={`stat-card humidity ${getStatusColor(latestData?.humidity, 'humidity')}`}>
          <h3>💧 Umidità</h3>
          <div className="value">{latestData?.humidity != null ? `${latestData.humidity.toFixed(0)}%` : '--'}</div>
          <div className="range">40 – 70% (ottimale)</div>
          <div className="status-indicator">
            {latestData?.humidity != null && (latestData.humidity < 40 ? '⬇️ Secco' : latestData.humidity > 70 ? '⬆️ Bagnato' : '✅ Ottimale')}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {gardenData.length > 0 && (
        <div className="charts-section">
          <h2>📊 Andamento parametri</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <LineChart data={chartData('ph')} color="#3498db" label="pH" />
            </div>
            <div className="chart-card">
              <LineChart data={chartData('ec')} color="#9b59b6" label="EC (mS/cm)" />
            </div>
            <div className="chart-card">
              <LineChart data={chartData('temperature')} color="#e74c3c" label="Temperatura (°C)" />
            </div>
            <div className="chart-card">
              <LineChart data={chartData('humidity')} color="#1abc9c" label="Umidità (%)" />
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="stats-section">
          <h2>📈 Statistiche riepilogo</h2>
          <div className="stats-details">
            <div className="stat-item">
              <span className="stat-label">pH medio</span>
              <span className="stat-value">{stats.ph?.avg?.toFixed(2) || '--'}</span>
              <span className="stat-range">min {stats.ph?.min?.toFixed(2)} / max {stats.ph?.max?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">EC medio</span>
              <span className="stat-value">{stats.ec?.avg?.toFixed(2) || '--'}</span>
              <span className="stat-range">min {stats.ec?.min?.toFixed(2)} / max {stats.ec?.max?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Temperatura media</span>
              <span className="stat-value">{stats.temperature?.avg?.toFixed(1) || '--'}°C</span>
              <span className="stat-range">min {stats.temperature?.min?.toFixed(1)} / max {stats.temperature?.max?.toFixed(1)}°C</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Umidità media</span>
              <span className="stat-value">{stats.humidity?.avg?.toFixed(0) || '--'}%</span>
              <span className="stat-range">min {stats.humidity?.min?.toFixed(0)} / max {stats.humidity?.max?.toFixed(0)}%</span>
            </div>
            <div className="stat-item stat-item-wide">
              <span className="stat-label">Letture totali</span>
              <span className="stat-value">{stats.readings || 0}</span>
              <span className="stat-range">Periodo: {dateRange === '24h' ? '24 ore' : dateRange === '7d' ? '7 giorni' : '30 giorni'}</span>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="history-section">
        <div className="section-header">
          <h2>📋 Storico dati</h2>
          <span className="record-count">{gardenData.length} letture</span>
        </div>
        <div className="table-container">
          <table role="table" aria-label="Storico letture sensori">
            <thead>
              <tr>
                <th>Data/Ora</th>
                <th>pH</th>
                <th>EC (mS/cm)</th>
                <th>Temperatura</th>
                <th>Umidità</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {gardenData.slice(0, 50).map((reading, index) => {
                const allOk = reading.ph >= 6.0 && reading.ph <= 7.5 &&
                  reading.ec >= 0.8 && reading.ec <= 2.0 &&
                  reading.temperature >= 15 && reading.temperature <= 25 &&
                  reading.humidity >= 40 && reading.humidity <= 70;
                return (
                  <tr key={index} className={allOk ? 'row-ok' : 'row-warning'}>
                    <td>{new Date(reading.timestamp).toLocaleString()}</td>
                    <td className={`value-cell ${getStatusColor(reading.ph, 'ph')}`}>{reading.ph}</td>
                    <td className={`value-cell ${getStatusColor(reading.ec, 'ec')}`}>{reading.ec}</td>
                    <td className={`value-cell ${getStatusColor(reading.temperature, 'temperature')}`}>{reading.temperature}°C</td>
                    <td className={`value-cell ${getStatusColor(reading.humidity, 'humidity')}`}>{reading.humidity}%</td>
                    <td>{allOk ? '✅' : '⚠️'}</td>
                  </tr>
                );
              })}
              {gardenData.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">Nessun dato disponibile</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {gardenData.length > 50 && (
          <p className="table-note">Mostrate le ultime 50 letture su {gardenData.length}</p>
        )}
      </div>
    </div>
  );
};

export default UrbanGardenDashboard;