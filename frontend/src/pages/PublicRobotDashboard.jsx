import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Chart from 'chart.js/auto';
import './PublicRobotDashboard.css';

const WS_URL = process.env.REACT_APP_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`);

const STATUS_META = {
  idle: { label: 'Idle', color: '#94a3b8' },
  working: { label: 'In Lavoro', color: '#3b82f6' },
  delivering: { label: 'In Consegna', color: '#22c55e' },
  dispute: { label: 'Disputa', color: '#ef4444' }
};

const PublicRobotDashboard = () => {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const chartRef = useRef(null);
  const lineChartRef = useRef(null);

  // Fetch initial stats
  useEffect(() => {
    fetchSnapshot();
    const iv = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(iv);
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('public:metrics', (data) => {
      setStats(data);
      setSeries(prev => {
        const next = [...prev, { t: Date.now(), active: data.activeRobots || 0, jobs: data.totalJobsCompleted || 0 }];
        return next.length > 30 ? next.slice(-30) : next;
      });
    });
    socket.emit('public:subscribe');
    return () => socket.disconnect();
  }, []);

  const fetchSnapshot = async () => {
    try {
      const res = await axios.get('/api/public-dashboard/stats');
      if (res.data.success) {
        const d = res.data.data;
        setStats(d);
        setSeries(prev => {
          const next = [...prev, { t: Date.now(), active: d.activeRobots || 0, jobs: d.totalJobsCompleted || 0 }];
          return next.length > 30 ? next.slice(-30) : next;
        });
      }
    } catch (err) {
      console.error('Failed to fetch public dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  // Render status donut chart
  useEffect(() => {
    if (!stats || !chartRef.current) return;
    const byStatus = stats.byStatus || {};
    const ctx = chartRef.current.getContext('2d');
    if (window.__publicStatusChart) window.__publicStatusChart.destroy();
    window.__publicStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(STATUS_META).map(k => STATUS_META[k].label),
        datasets: [{
          data: Object.keys(STATUS_META).map(k => byStatus[k] || 0),
          backgroundColor: Object.keys(STATUS_META).map(k => STATUS_META[k].color),
          borderWidth: 2,
          borderColor: '#0f172a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } }
      }
    });
  }, [stats]);

  // Render activity line chart
  useEffect(() => {
    if (!series.length || !lineChartRef.current) return;
    const ctx = lineChartRef.current.getContext('2d');
    if (window.__publicLineChart) window.__publicLineChart.destroy();
    window.__publicLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map(s => new Date(s.t).toLocaleTimeString()),
        datasets: [
          { label: 'Robot Attivi', data: series.map(s => s.active), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true },
          { label: 'Job Completati', data: series.map(s => s.jobs), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } }
        },
        plugins: { legend: { labels: { color: '#cbd5e1' } } }
      }
    });
  }, [series]);

  const copyEmbedCode = () => {
    const code = `<iframe src="${window.location.origin}/#/public-dashboard" width="100%" height="480" style="border:0;border-radius:12px;overflow:hidden" title="MyZubster Public Dashboard" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading && !stats) {
    return <div className="pd-loading">🔄 Caricamento della dashboard pubblica...</div>;
  }

  const byStatus = stats?.byStatus || {};
  const totalStatus = Object.values(byStatus).reduce((a, b) => a + (b || 0), 0) || 1;
  const topRobots = stats?.topRobots || [];

  return (
    <div className="pd-wrap">
      <header className="pd-header">
        <div className="pd-header-title">
          <div className="pd-logo">🤖</div>
          <div>
            <h1>MyZubster Network Live</h1>
            <p className="pd-subtitle">Dashboard pubblica dei robot in tempo reale</p>
          </div>
        </div>
        <div className="pd-live-badge-wrap">
          <span className={`pd-live-badge ${live ? 'on' : ''}`}>
            <span className="pd-live-dot" /> {live ? 'LIVE' : 'OFFLINE'}
          </span>
          <button className="pd-embed-btn" onClick={copyEmbedCode}>
            {copied ? '✓ Copiato!' : '⧉ Embed Widget'}
          </button>
        </div>
      </header>

      <div className="pd-cards">
        <div className="pd-card pd-card-blue">
          <div className="pd-card-label">Robot Attivi</div>
          <div className="pd-card-value">{stats?.activeRobots ?? 0}</div>
          <div className="pd-card-sub">su {stats?.totalRobots ?? 0} totali</div>
        </div>
        <div className="pd-card pd-card-green">
          <div className="pd-card-label">MYZ Spesi dai Clienti</div>
          <div className="pd-card-value">{Number(stats?.tokensSpent ?? 0).toLocaleString()}</div>
          <div className="pd-card-sub">importo stimato</div>
        </div>
        <div className="pd-card pd-card-amber">
          <div className="pd-card-label">Commissioni Generate</div>
          <div className="pd-card-value">{Number(stats?.commissions ?? 0).toLocaleString()} MYZ</div>
          <div className="pd-card-sub">~5% del transato</div>
        </div>
        <div className="pd-card pd-card-violet">
          <div className="pd-card-label">Job Completati</div>
          <div className="pd-card-value">{stats?.totalJobsCompleted ?? 0}</div>
          <div className="pd-card-sub">in corso: {stats?.jobsInProgress ?? 0}</div>
        </div>
      </div>

      <div className="pd-grid pd-grid-2">
        <div className="pd-panel">
          <h2 className="pd-panel-title">Stato Robot</h2>
          <div className="pd-donut-wrap">
            <canvas ref={chartRef} />
          </div>
          <div className="pd-status-legend">
            {Object.entries(STATUS_META).map(([k, m]) => (
              <div key={k} className="pd-legend-item">
                <span className="pd-legend-dot" style={{ background: m.color }} />
                <span>{m.label}</span>
                <strong>{byStatus[k] || 0}</strong>
                <em>{Math.round(((byStatus[k] || 0) / totalStatus) * 100)}%</em>
              </div>
            ))}
          </div>
        </div>

        <div className="pd-panel">
          <h2 className="pd-panel-title">Attività in Tempo Reale</h2>
          <div className="pd-line-wrap">
            <canvas ref={lineChartRef} />
          </div>
        </div>
      </div>

      <div className="pd-panel">
        <h2 className="pd-panel-title">Robot più Popolari</h2>
        {topRobots.length === 0 ? (
          <p className="pd-empty">Nessun robot registrato ancora.</p>
        ) : (
          <div className="pd-top-list">
            {topRobots.map((r, i) => (
              <div key={r.robotId || i} className="pd-top-item">
                <div className="pd-top-rank">{i + 1}</div>
                <div className="pd-top-info">
                  <div className="pd-top-name">{r.name || r.robotId}</div>
                  <div className="pd-top-meta">
                    <span className={`pd-status-chip chip-${r.status}`}>{STATUS_META[r.status]?.label || r.status}</span>
                    <span>⭐ {r.reputation}</span>
                    <span>💼 {r.jobsCompleted} job</span>
                  </div>
                </div>
                <div className="pd-top-earned">{Number(r.totalEarned || 0).toLocaleString()} MYZ</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="pd-footer">
        Dati aggiornati in tempo reale via WebSocket · MyZubster Gateway © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default PublicRobotDashboard;