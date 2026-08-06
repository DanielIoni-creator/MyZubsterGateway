import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import './UrbanGardenDashboard.css';

// ---------- Pure SVG line chart (no external chart library) ----------
const MetricChart = ({ label, data, color, unit }) => {
  const width = 460;
  const height = 160;
  const padX = 40;
  const padY = 24;

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        Nessun dato per {label}
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (height - padY * 2) * (1 - (d.value - min) / range);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${padX} ${height - padY} Z`;

  return (
    <div className="chart-wrap">
      <div className="chart-title">
        <span className="chart-dot" style={{ background: color }} />
        {label}
        {data.length > 0 && (
          <span className="chart-latest">{data[data.length - 1].value}{unit}</span>
        )}
      </div>
      <svg className="metric-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Grafico ${label}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * f}
            y2={padY + (height - padY * 2) * f}
            className="chart-gridline"
          />
        ))}
        <path d={areaPath} fill={color} opacity="0.15" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (i % Math.max(1, Math.floor(points.length / 12)) === 0 || i === points.length - 1) && (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="chart-axis">
        <span>{points.length > 0 ? new Date(points[0].timestamp).toLocaleDateString() : ''}</span>
        <span>{points.length > 0 ? new Date(points[points.length - 1].timestamp).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );
};

// ---------- Main Dashboard ----------
const UrbanGardenDashboard = () => {
  const [gardenData, setGardenData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gardenId, setGardenId] = useState('orto-rimini-001');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(30000); // 30s real-time
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (!latestData) setLoading(true);
      setError(null);
      const [historyRes, latestRes, statsRes] = await Promise.all([
        axios.get(`/api/sensors/garden/${gardenId}`, { signal: controller.signal }),
        axios.get(`/api/sensors/garden/${gardenId}/latest`, { signal: controller.signal }),
        axios.get(`/api/sensors/garden/${gardenId}/stats`, { signal: controller.signal })
      ]);
      setGardenData(historyRes.data.data || []);
      setLatestData(latestRes.data.data || null);
      setStats(statsRes.data.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Errore nel caricamento dei dati. Riprova tra poco.');
      }
    } finally {
      setLoading(false);
    }
  }, [gardenId, latestData]);

  useEffect(() => {
    fetchData();
    if (!isLive) return undefined;
    const interval = setInterval(fetchData, autoRefresh);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, isLive, autoRefresh]);

  // Build series for the charts from history data
  const series = useMemo(() => {
    if (!gardenData || gardenData.length === 0) return { ph: [], ec: [], temperature: [], humidity: [] };
    const sorted = [...gardenData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const map = (key) =>
      sorted
        .filter((d) => d[key] != null)
        .map((d) => ({ value: parseFloat(d[key]), timestamp: d.timestamp }));
    return {
      ph: map('ph'),
      ec: map('ec'),
      temperature: map('temperature'),
      humidity: map('humidity')
    };
  }, [gardenData]);

  // Export report as CSV
  const exportReport = useCallback(() => {
    if (!gardenData || gardenData.length === 0) return;
    setExporting(true);
    setTimeout(() => {
      const header = ['timestamp', 'ph', 'ec', 'temperature', 'humidity'];
      const rows = gardenData.map((d) => [
        d.timestamp,
        d.ph ?? '',
        d.ec ?? '',
        d.temperature ?? '',
        d.humidity ?? ''
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orto-${gardenId}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 50);
  }, [gardenData, gardenId]);

  const totalPages = Math.max(1, Math.ceil(gardenData.length / pageSize));
  const pagedData = [...gardenData].slice((page - 1) * pageSize, page * pageSize);

  const refreshLabel = isLive ? `${autoRefresh / 1000}s` : 'pausa';

  return (
    <div className="urban-garden-dashboard">
      <header className="dashboard-header">
        <div className="header-row">
          <div>
            <h1>🌱 Orto Urbano - Rimini</h1>
            <p>Monitoraggio in tempo reale dei parametri del suolo</p>
          </div>
          <div className="header-controls">
            <label className="garden-select">
              <span>Orto</span>
              <select value={gardenId} onChange={(e) => { setGardenId(e.target.value); setPage(1); }}>
                <option value="orto-rimini-001">Orto Rimini</option>
                <option value="orto-bologna-001">Orto Bologna</option>
                <option value="orto-firenze-001">Orto Firenze</option>
              </select>
            </label>
            <button
              className={`live-toggle ${isLive ? 'active' : ''}`}
              onClick={() => setIsLive((v) => !v)}
              title="Attiva/disattiva aggiornamento automatico"
            >
              <span className="live-dot" /> {isLive ? 'Live' : 'In pausa'} · {refreshLabel}
            </button>
            <button className="export-btn" onClick={exportReport} disabled={exporting || gardenData.length === 0}>
              {exporting ? 'Esportazione...' : '⬇️ Esporta CSV'}
            </button>
          </div>
        </div>
        <div className="last-updated">
          Ultimo aggiornamento: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
        </div>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading && !latestData ? (
        <div className="loading">🌱 Caricamento dati orto...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card ph">
              <h3>pH</h3>
              <div className="value">{latestData?.ph ?? '--'}</div>
              <div className="range">6.0 - 7.5 (ottimale)</div>
            </div>
            <div className="stat-card ec">
              <h3>EC (Conducibilità)</h3>
              <div className="value">{latestData?.ec ?? '--'}</div>
              <div className="range">0.8 - 2.0 (ottimale)</div>
            </div>
            <div className="stat-card temperature">
              <h3>🌡️ Temperatura</h3>
              <div className="value">{latestData?.temperature ?? '--'}°C</div>
              <div className="range">15 - 25°C (ottimale)</div>
            </div>
            <div className="stat-card humidity">
              <h3>💧 Umidità</h3>
              <div className="value">{latestData?.humidity ?? '--'}%</div>
              <div className="range">40 - 70% (ottimale)</div>
            </div>
          </div>

          <div className="charts-section">
            <h2>📈 Andamenti</h2>
            <div className="charts-grid">
              <MetricChart label="pH" data={series.ph} color="#3498db" unit="" />
              <MetricChart label="Conducibilità (EC)" data={series.ec} color="#9b59b6" unit="" />
              <MetricChart label="Temperatura" data={series.temperature} color="#e74c3c" unit="°C" />
              <MetricChart label="Umidità" data={series.humidity} color="#1abc9c" unit="%" />
            </div>
          </div>

          <div className="history-section">
            <div className="section-head">
              <h2>📋 Storico dati</h2>
              <span className="record-count">{gardenData.length} letture</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data/Ora</th>
                    <th>pH</th>
                    <th>EC</th>
                    <th>Temperatura</th>
                    <th>Umidità</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((reading, index) => (
                    <tr key={`${reading.timestamp}-${index}`}>
                      <td>{new Date(reading.timestamp).toLocaleString()}</td>
                      <td>{reading.ph ?? '—'}</td>
                      <td>{reading.ec ?? '—'}</td>
                      <td>{reading.temperature != null ? `${reading.temperature}°C` : '—'}</td>
                      <td>{reading.humidity != null ? `${reading.humidity}%` : '—'}</td>
                    </tr>
                  ))}
                  {pagedData.length === 0 && (
                    <tr>
                      <td colSpan="5">Nessun dato disponibile</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Precedente</button>
                <span>Pagina {page} di {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Successiva →</button>
              </div>
            )}
          </div>

          <div className="stats-section">
            <h2>📊 Statistiche</h2>
            {stats ? (
              <div className="stats-details">
                <div>
                  <strong>pH medio</strong>
                  <span>{stats.ph?.avg?.toFixed(2) ?? '--'}</span>
                </div>
                <div>
                  <strong>EC medio</strong>
                  <span>{stats.ec?.avg?.toFixed(2) ?? '--'}</span>
                </div>
                <div>
                  <strong>Temperatura media</strong>
                  <span>{stats.temperature?.avg?.toFixed(1) ?? '--'}°C</span>
                </div>
                <div>
                  <strong>Umidità media</strong>
                  <span>{stats.humidity?.avg?.toFixed(1) ?? '--'}%</span>
                </div>
                <div>
                  <strong>Letture totali</strong>
                  <span>{stats.readings ?? 0}</span>
                </div>
              </div>
            ) : (
              <p>Statistiche non disponibili</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UrbanGardenDashboard;