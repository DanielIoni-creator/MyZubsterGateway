import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Chart from 'chart.js/auto';

const WS_URL = process.env.REACT_APP_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`);

const EMBED_STYLES = {
  wrap: {
    background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '16px', borderRadius: '12px', minHeight: '240px'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  title: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 },
  badge: { fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' },
  metric: { background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' },
  label: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  value: { fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', lineHeight: '1.3' },
  footer: { textAlign: 'center', fontSize: '0.7rem', color: '#334155', marginTop: '8px' }
};

const EmbeddableWidget = () => {
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('public:metrics', (data) => {
      setStats(data);
      renderMiniChart(data);
    });
    socket.emit('public:subscribe');
    return () => socket.disconnect();
  }, []);

  const renderMiniChart = (data) => {
    if (!chartRef.current) return;
    const byStatus = data?.byStatus || {};
    const ctx = chartRef.current.getContext('2d');
    if (window.__embedChart) window.__embedChart.destroy();
    window.__embedChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Idle', 'Working', 'Delivering', 'Dispute'],
        datasets: [{
          data: [byStatus.idle || 0, byStatus.working || 0, byStatus.delivering || 0, byStatus.dispute || 0],
          backgroundColor: ['#94a3b8', '#3b82f6', '#22c55e', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  };

  return (
    <div style={EMBED_STYLES.wrap}>
      <div style={EMBED_STYLES.header}>
        <h3 style={EMBED_STYLES.title}>🤖 MyZubster Network</h3>
        {live && <span style={EMBED_STYLES.badge}>LIVE</span>}
      </div>
      <div style={EMBED_STYLES.grid}>
        <div style={EMBED_STYLES.metric}>
          <div style={EMBED_STYLES.label}>Robot Attivi</div>
          <div style={EMBED_STYLES.value}>{stats?.activeRobots ?? 0}</div>
        </div>
        <div style={EMBED_STYLES.metric}>
          <div style={EMBED_STYLES.label}>MYZ Spesi</div>
          <div style={EMBED_STYLES.value}>{Number(stats?.totalJobsCompleted ?? 0).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ height: '80px', position: 'relative' }}>
        <canvas ref={chartRef} />
      </div>
      <div style={EMBED_STYLES.footer}>myzubster.com</div>
    </div>
  );
};

export default EmbeddableWidget;