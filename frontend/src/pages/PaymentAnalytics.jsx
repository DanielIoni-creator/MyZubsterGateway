import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/axiosConfig';
import './PaymentAnalytics.css';

const STATUS_MAP = {
  PENDING: { label: 'In attesa', color: '#f39c12' },
  CONFIRMING: { label: 'In conferma', color: '#3498db' },
  COMPLETED: { label: 'Completato', color: '#2ecc71' },
  FAILED: { label: 'Fallito', color: '#e74c3c' },
  CANCELLED: { label: 'Annullato', color: '#95a5a6' },
  EXPIRED: { label: 'Scaduto', color: '#7f8c8d' },
};

const CURRENCY_MAP = {
  MYZ: { label: 'MYZ', color: '#8e44ad' },
  XMR: { label: 'XMR', color: '#f39c12' },
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ──────────────────────────────────────────────────────────────
// Helper: format a date string to locale date
// ──────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
};

// ──────────────────────────────────────────────────────────────
// Helper: group payments by day buckets
// ──────────────────────────────────────────────────────────────
const groupByDay = (items) => {
  const map = {};
  items.forEach((t) => {
    if (!t.createdAt) return;
    const key = t.createdAt.slice(0, 10); // YYYY-MM-DD
    if (!map[key]) map[key] = { date: key, count: 0, total: 0, currency: {} };
    map[key].count += 1;
    map[key].total += Number(t.amount) || 0;
    const cur = t.currency || 'MYZ';
    map[key].currency[cur] = (map[key].currency[cur] || 0) + (Number(t.amount) || 0);
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
};

// ──────────────────────────────────────────────────────────────
// Helper: group by week
// ──────────────────────────────────────────────────────────────
const groupByWeek = (items) => {
  const map = {};
  items.forEach((t) => {
    if (!t.createdAt) return;
    const d = new Date(t.createdAt);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().slice(0, 10);
    if (!map[key]) map[key] = { weekStart: key, count: 0, total: 0, currency: {} };
    map[key].count += 1;
    map[key].total += Number(t.amount) || 0;
    const cur = t.currency || 'MYZ';
    map[key].currency[cur] = (map[key].currency[cur] || 0) + (Number(t.amount) || 0);
  });
  return Object.values(map).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};

// ──────────────────────────────────────────────────────────────
// Helper: simple linear forecast
// ──────────────────────────────────────────────────────────────
const calcForecast = (dailyData, days = 7) => {
  if (dailyData.length < 2) return [];
  const values = dailyData.map((d) => d.total);
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    const val = slope * (n - 1 + i) + intercept;
    forecast.push({ day: i, predicted: Math.max(0, Math.round(val * 100) / 100) });
  }
  return forecast;
};

// ──────────────────────────────────────────────────────────────
// Helper: detect anomalies (Z-score)
// ──────────────────────────────────────────────────────────────
const detectAnomalies = (items, threshold = 2) => {
  if (items.length < 3) return [];
  const amounts = items.map((t) => Number(t.amount) || 0);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
  if (std === 0) return [];
  return items.filter((t) => {
    const z = Math.abs((Number(t.amount) || 0) - mean) / std;
    return z > threshold;
  });
};

// ──────────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────────

const TrendBarChart = ({ data, labelKey, valueKey, color }) => {
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="trend-chart">
      {data.map((d, i) => {
        const pct = (d[valueKey] / maxVal) * 100;
        const dateLabel = d[labelKey] ? d[labelKey].slice(5) : '';
        return (
          <div className="trend-bar-wrap" key={i}>
            <div className="trend-bar-label">{dateLabel}</div>
            <div className="trend-bar-track">
              <div
                className="trend-bar-fill"
                style={{ height: `${pct}%`, background: color || '#3498db' }}
                title={`${d[labelKey]}: ${d[valueKey]}`}
              />
            </div>
            <div className="trend-bar-value">{d[valueKey]}</div>
          </div>
        );
      })}
    </div>
  );
};

const StatusPieChart = ({ data }) => {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  let cumulative = 0;
  return (
    <div className="pie-chart">
      <svg viewBox="0 0 36 36" className="pie-svg">
        {Object.entries(data).map(([key, val], i) => {
          const pct = val / total;
          const offset = cumulative;
          cumulative += pct;
          const colors = ['#2ecc71','#3498db','#f39c12','#e74c3c','#95a5a6','#7f8c8d'];
          return (
            <circle
              key={key}
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="3"
              strokeDasharray={`${pct * 100} ${(1 - pct) * 100}`}
              strokeDashoffset={-offset * 100}
              transform="rotate(-90 18 18)"
            />
          );
        })}
        <text x="18" y="18" textAnchor="middle" dominantBaseline="central" className="pie-center-text">
          {total}
        </text>
      </svg>
      <div className="pie-legend">
        {Object.entries(data).map(([key, val], i) => {
          const colors = ['#2ecc71','#3498db','#f39c12','#e74c3c','#95a5a6','#7f8c8d'];
          return (
            <div className="pie-legend-item" key={key}>
              <span className="pie-dot" style={{ background: colors[i % colors.length] }} />
              <span className="pie-label">{STATUS_MAP[key]?.label || key}</span>
              <span className="pie-count">{val} ({(val/total*100).toFixed(1)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

const PaymentAnalytics = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('daily'); // daily | weekly
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currencyFilter, setCurrencyFilter] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 200 };
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      if (currencyFilter) params.currency = currencyFilter;

      const res = await api.get('/payments', { params });
      const data = res.data;
      setPayments(data.items || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Errore nel caricamento dei pagamenti. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, currencyFilter]);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 60000);
    return () => clearInterval(interval);
  }, [fetchPayments]);

  // ── Derived data ──────────────────────────────────────
  const groupedData = useMemo(() => {
    return viewMode === 'daily' ? groupByDay(payments) : groupByWeek(payments);
  }, [payments, viewMode]);

  const totalAmount = useMemo(
    () => payments.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [payments]
  );

  const statusCounts = useMemo(() => {
    const counts = {};
    payments.forEach((t) => {
      const s = t.status || 'UNKNOWN';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [payments]);

  const currencyTotals = useMemo(() => {
    const totals = {};
    payments.forEach((t) => {
      const cur = t.currency || 'MYZ';
      totals[cur] = (totals[cur] || 0) + (Number(t.amount) || 0);
    });
    return totals;
  }, [payments]);

  const forecast = useMemo(() => calcForecast(groupedData, 7), [groupedData]);
  const anomalies = useMemo(() => detectAnomalies(payments), [payments]);

  // ── Export ────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['ID', 'Data', 'Importo', 'Valuta', 'Stato', 'Riferimento', 'TX ID'];
    const rows = payments.map((t) => [
      t.id,
      fmtDate(t.createdAt),
      t.amount,
      t.currency || 'MYZ',
      STATUS_MAP[t.status]?.label || t.status,
      t.reference || '',
      t.txId || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-pagamenti-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalPayments: payments.length,
        totalAmount,
        currencyTotals,
        statusCounts,
      },
      analytics: {
        trend: groupedData,
        forecast,
        anomalies: anomalies.length,
      },
      payments,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-analisi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────
  if (loading) {
    return <div className="analytics-loading">📊 Caricamento analisi pagamenti...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  return (
    <div className="payment-analytics">
      <header className="analytics-header">
        <h1>📈 Analisi Pagamenti e Trend</h1>
        <p>Monitoraggio statistico dei flussi di pagamento</p>
      </header>

      {/* ── Filters ── */}
      <div className="analytics-filters">
        <div className="filter-group">
          <label>Da:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
          />
          <label>A:</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
          />
          <label>Valuta:</label>
          <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            <option value="">Tutte</option>
            <option value="MYZ">MYZ</option>
            <option value="XMR">XMR</option>
          </select>
          <button className="btn-view" onClick={() => setViewMode(viewMode === 'daily' ? 'weekly' : 'daily')}>
            {viewMode === 'daily' ? '📅 Vista Settimanale' : '📆 Vista Giornaliera'}
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="analytics-stats-grid">
        <div className="stat-card a-total">
          <h3>Totale Pagamenti</h3>
          <div className="value">{payments.length}</div>
        </div>
        <div className="stat-card a-amount">
          <h3>Importo Totale</h3>
          <div className="value">{totalAmount.toFixed(2)}</div>
          <div className="sub">
            {Object.entries(currencyTotals).map(([cur, val]) => (
              <span key={cur} style={{ color: CURRENCY_MAP[cur]?.color || '#666' }}>
                {val.toFixed(2)} {cur}
              </span>
            ))}
          </div>
        </div>
        <div className="stat-card a-avg">
          <h3>Media per Transazione</h3>
          <div className="value">
            {payments.length > 0 ? (totalAmount / payments.length).toFixed(2) : '0'}
          </div>
        </div>
        <div className="stat-card a-anomalies">
          <h3>Anomalie Rilevate</h3>
          <div className="value">{anomalies.length}</div>
        </div>
      </div>

      {/* ── Trend Chart ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>📊 Trend {viewMode === 'daily' ? 'Giornalieri' : 'Settimanali'}</h2>
          <span className="section-subtitle">Andamento importi nel tempo</span>
        </div>
        {groupedData.length > 0 ? (
          <TrendBarChart
            data={groupedData.slice(-14)}
            labelKey={viewMode === 'daily' ? 'date' : 'weekStart'}
            valueKey="total"
            color="#3498db"
          />
        ) : (
          <div className="empty-state">Nessun dato disponibile per il periodo selezionato.</div>
        )}
      </div>

      {/* ── Status Distribution + Forecast ── */}
      <div className="analytics-grid-2col">
        <div className="analytics-section">
          <h2>🎯 Distribuzione Stati</h2>
          {Object.keys(statusCounts).length > 0 ? (
            <StatusPieChart data={statusCounts} />
          ) : (
            <div className="empty-state">Nessun dato.</div>
          )}
        </div>

        <div className="analytics-section">
          <h2>🔮 Previsioni (7 Giorni)</h2>
          {forecast.length > 0 ? (
            <div className="forecast-section">
              <TrendBarChart
                data={forecast}
                labelKey="day"
                valueKey="predicted"
                color="#9b59b6"
              />
              <div className="forecast-note">
                Basato su {groupedData.length} periodi di dati storici.
                Previsione lineare semplice.
              </div>
            </div>
          ) : (
            <div className="empty-state">Dati insufficienti per le previsioni. Servono almeno 2 periodi.</div>
          )}
        </div>
      </div>

      {/* ── Anomalies ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>⚠️ Transazioni Anomale</h2>
          <span className="section-subtitle">
            Z-score &gt; 2 — valori statisticamente fuori norma
          </span>
        </div>
        {anomalies.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Importo</th>
                  <th>Valuta</th>
                  <th>Stato</th>
                  <th>Riferimento</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((t) => (
                  <tr className="anomaly-row" key={t.id}>
                    <td>{t.id}</td>
                    <td>{fmtDate(t.createdAt)}</td>
                    <td className="amount-cell">{(Number(t.amount) || 0).toFixed(2)}</td>
                    <td>{t.currency || 'MYZ'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: STATUS_MAP[t.status]?.color || '#95a5a6' }}
                      >
                        {STATUS_MAP[t.status]?.label || t.status}
                      </span>
                    </td>
                    <td>{t.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">✅ Nessuna anomalia rilevata nei dati correnti.</div>
        )}
      </div>

      {/* ── Export ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>📤 Export Report</h2>
          <span className="section-subtitle">Scarica i dati in formato CSV o JSON</span>
        </div>
        <div className="export-actions">
          <button className="btn-export csv" onClick={handleExportCSV}>
            📥 Esporta CSV
          </button>
          <button className="btn-export json" onClick={handleExportJSON}>
            📥 Esporta JSON (Report Completo)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;