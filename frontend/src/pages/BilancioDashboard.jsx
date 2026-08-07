import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/axiosConfig';
import './BilancioDashboard.css';

const CURRENCY_MAP = {
  MYZ: { label: 'MYZ', color: '#8e44ad' },
  XMR: { label: 'XMR', color: '#f39c12' },
};

const STATUS_MAP = {
  PENDING: { label: 'In attesa', color: '#f39c12' },
  CONFIRMING: { label: 'In conferma', color: '#3498db' },
  COMPLETED: { label: 'Completato', color: '#2ecc71' },
  FAILED: { label: 'Fallito', color: '#e74c3c' },
  CANCELLED: { label: 'Annullato', color: '#95a5a6' },
  EXPIRED: { label: 'Scaduto', color: '#7f8c8d' },
};

const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const fmtAmount = (n, decimals = 2) => {
  if (n == null) return '0.00';
  return Number(n).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
};

// Group payments by month (YYYY-MM)
const groupByMonth = (items) => {
  const map = {};
  items.forEach((t) => {
    if (!t.createdAt) return;
    const key = t.createdAt.slice(0, 7); // YYYY-MM
    if (!map[key]) map[key] = { month: key, total: 0, completed: 0, failed: 0, currency: { MYZ: 0, XMR: 0 }, count: 0 };
    const amount = Number(t.amount) || 0;
    map[key].total += amount;
    map[key].count += 1;
    const cur = t.currency || 'MYZ';
    map[key].currency[cur] = (map[key].currency[cur] || 0) + amount;
    if (t.status === 'COMPLETED') map[key].completed += amount;
    if (t.status === 'FAILED' || t.status === 'CANCELLED') map[key].failed += amount;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

// Group by category (currency + status basis)
const groupByCategory = (items) => {
  const map = {};
  items.forEach((t) => {
    const cur = t.currency || 'MYZ';
    const cat = `${cur !== 'MYZ' ? 'XMR' : 'MYZ'}`;
    if (!map[cat]) map[cat] = { name: cat, total: 0, count: 0 };
    if (t.status === 'COMPLETED') {
      map[cat].total += Number(t.amount) || 0;
      map[cat].count += 1;
    }
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
};

// Simple linear forecast of monthly totals
const calcForecast = (monthlyData, months = 3) => {
  if (monthlyData.length < 2) return [];
  const values = monthlyData.map((d) => d.total);
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
  for (let i = 1; i <= months; i++) {
    const val = slope * (n - 1 + i) + intercept;
    forecast.push({ month: `+${i}`, predicted: Math.max(0, Math.round(val * 100) / 100) });
  }
  return forecast;
};

// ──────────────────────────────────────────────────────────────
// Bar chart component
// ──────────────────────────────────────────────────────────────
const BilancioBarChart = ({ data, labelKey, valueKey, color }) => {
  const maxVal = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="bilancio-trend-chart">
      {data.map((d, i) => {
        const pct = (d[valueKey] / maxVal) * 100;
        const label = d[labelKey] && d[labelKey].length >= 7 ? d[labelKey].slice(5) : d[labelKey];
        return (
          <div className="bilancio-trend-bar-wrap" key={i}>
            <div className="bilancio-trend-bar-label">{label}</div>
            <div className="bilancio-trend-bar-track">
              <div
                className="bilancio-trend-bar-fill"
                style={{ height: `${pct}%`, background: color || '#8e44ad' }}
                title={`${d[labelKey]}: ${fmtAmount(d[valueKey])}`}
              />
            </div>
            <div className="bilancio-trend-bar-value">{fmtAmount(d[valueKey], 0)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
const BilancioDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('monthly'); // monthly | annual
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currencyFilter, setCurrencyFilter] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 500 };
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

  // ── Derived data ──
  const monthlyData = useMemo(() => groupByMonth(payments), [payments]);
  const categories = useMemo(() => groupByCategory(payments), [payments]);

  // Aggregate by year when annual period selected
  const chartData = useMemo(() => {
    if (period === 'annual') {
      const yearMap = {};
      monthlyData.forEach((m) => {
        const year = m.month.slice(0, 4);
        if (!yearMap[year]) yearMap[year] = { month: year, total: 0 };
        yearMap[year].total += m.total;
      });
      return Object.values(yearMap).sort((a, b) => a.month.localeCompare(b.month));
    }
    return monthlyData;
  }, [monthlyData, period]);

  const forecast = useMemo(() => calcForecast(monthlyData, 3), [monthlyData]);

  // Totals
  const totals = useMemo(() => {
    let total = 0, myz = 0, xmr = 0, completedCount = 0;
    payments.forEach((t) => {
      const amt = Number(t.amount) || 0;
      total += amt;
      if (t.currency === 'XMR') xmr += amt; else myz += amt;
      if (t.status === 'COMPLETED') completedCount += 1;
    });
    return { total, myz, xmr, completedCount };
  }, [payments]);

  // Current month total
  const currentMonth = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const m = monthlyData.find((x) => x.month === key);
    return m ? m.total : 0;
  }, [monthlyData]);

  // Category max for bar widths
  const catMax = Math.max(...categories.map((c) => c.total), 1);

  // ── Exports ──
  const exportCSV = () => {
    const header = ['Periodo', 'Totale MYZ', 'Totale XMR', 'Numero pagamenti'];
    const rows = monthlyData.map((m) => [
      m.month,
      m.currency['MYZ'] || 0,
      m.currency['XMR'] || 0,
      m.count,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bilancio-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ monthlyData, categories, forecast }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bilancio-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="bilancio-loading">Caricamento bilancio...</div>;
  if (error) return <div className="bilancio-error">{error}</div>;

  return (
    <div className="bilancio-dashboard">
      <div className="bilancio-header">
        <h1>📊 Bilancio - Analisi Finanziaria</h1>
        <p>Bilancio mensile/annuale, categorie di spesa, previsioni e report dettagliati</p>
      </div>

      {/* Filters */}
      <div className="bilancio-filters">
        <div className="bilancio-filter-group">
          <label>Da:</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange((s) => ({ ...s, from: e.target.value }))} />
          <label>A:</label>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange((s) => ({ ...s, to: e.target.value }))} />
          <label>Valuta:</label>
          <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            <option value="">Tutte</option>
            <option value="MYZ">MYZ</option>
            <option value="XMR">XMR</option>
          </select>
          <button className="btn-view" onClick={fetchPayments}>Applica</button>
          <div className="period-toggle">
            <button className={`period-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>Mensile</button>
            <button className={`period-btn ${period === 'annual' ? 'active' : ''}`} onClick={() => setPeriod('annual')}>Annuale</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bilancio-stats-grid">
        <div className="bilancio-stat-card balance-total">
          <h3>Totale Movimenti</h3>
          <div className="value">{fmtAmount(totals.total)}</div>
          <div className="sub">{totals.completedCount} completati</div>
        </div>
        <div className="bilancio-stat-card balance-month">
          <h3>Mese Corrente</h3>
          <div className="value">{fmtAmount(currentMonth)}</div>
        </div>
        <div className="bilancio-stat-card balance-myzm">
          <h3>Totale MYZ</h3>
          <div className="value">{fmtAmount(totals.myz)}</div>
        </div>
        <div className="bilancio-stat-card balance-xmr">
          <h3>Totale XMR</h3>
          <div className="value">{fmtAmount(totals.xmr)}</div>
        </div>
      </div>

      {/* Trend */}
      <div className="bilancio-section">
        <div className="section-header">
          <h2>Andamento {period === 'monthly' ? 'Mensile' : 'Annuale'}</h2>
          <span className="section-subtitle">Totale movimenti nel periodo</span>
        </div>
        {chartData.length === 0 ? (
          <div className="bilancio-empty">Nessun dato disponibile</div>
        ) : (
          <BilancioBarChart data={chartData} labelKey="month" valueKey="total" color="#8e44ad" />
        )}
      </div>

      {/* Categories + Forecast */}
      <div className="bilancio-grid-2col">
        <div className="bilancio-section">
          <div className="section-header">
            <h2>Categorie di Valuta</h2>
            <span className="section-subtitle">Distribuzione per valuta</span>
          </div>
          {categories.length === 0 ? (
            <div className="bilancio-empty">Nessuna categoria</div>
          ) : (
            <div className="category-list">
              {categories.map((c) => (
                <div className="category-item" key={c.name}>
                  <span className="category-dot" style={{ background: CURRENCY_MAP[c.name]?.color || '#8e44ad' }} />
                  <span className="category-name">{c.name}</span>
                  <div className="category-bar">
                    <div className="category-fill" style={{ width: `${(c.total / catMax) * 100}%`, background: CURRENCY_MAP[c.name]?.color || '#8e44ad' }} />
                  </div>
                  <span className="category-amount">{fmtAmount(c.total)}</span>
                  <span className="category-pct">{((c.total / Math.max(totals.total, 1)) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bilancio-section">
          <div className="section-header">
            <h2>Previsioni</h2>
            <span className="section-subtitle">Proiezione prossimi 3 mesi</span>
          </div>
          {forecast.length === 0 ? (
            <div className="bilancio-empty">Servono almeno 2 mesi di dati per le previsioni</div>
          ) : (
            <>
              <BilancioBarChart data={forecast} labelKey="month" valueKey="predicted" color="#3498db" />
              <div className="bilancio-forecast-note">
                Previsione basata su regressione lineare dei dati storici. Il valore è indicativo e non deve essere considerato consiglio finanziario.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detailed report */}
      <div className="bilancio-section">
        <div className="section-header">
          <h2>Report Dettagliato</h2>
          <div className="bilancio-export-actions">
            <button className="btn-export csv" onClick={exportCSV}>Esporta CSV</button>
            <button className="btn-export json" onClick={exportJSON}>Esporta JSON</button>
          </div>
        </div>
        {monthlyData.length === 0 ? (
          <div className="bilancio-empty">Nessun dato</div>
        ) : (
          <div className="bilancio-table-container">
            <table className="bilancio-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Totale</th>
                  <th>MYZ</th>
                  <th>XMR</th>
                  <th>Completati</th>
                  <th>Falliti</th>
                  <th>N. Pagamenti</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().map((m) => {
                  const [y, mo] = m.month.split('-');
                  return (
                    <tr key={m.month}>
                      <td>{MONTHS[parseInt(mo,10)-1]} {y}</td>
                      <td className="amount-cell">{fmtAmount(m.total)}</td>
                      <td className="amount-pos">{fmtAmount(m.currency['MYZ'] || 0)}</td>
                      <td className="amount-neg">{fmtAmount(m.currency['XMR'] || 0)}</td>
                      <td>{fmtAmount(m.completed)}</td>
                      <td>{fmtAmount(m.failed)}</td>
                      <td>{m.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BilancioDashboard;