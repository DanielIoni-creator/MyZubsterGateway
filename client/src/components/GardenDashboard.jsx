import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import './GardenDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

function GardenDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [history, setHistory] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { fetchHistory(); }, [timeRange, selectedMetric]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/garden-dashboard');
      const d = await res.json();
      setData(d);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/garden-dashboard/history?days=${timeRange}&metric=${selectedMetric}`);
      const h = await res.json();
      setHistory(h);
    } catch (err) { console.error(err); }
  };

  const handleExport = () => window.open('/api/garden-dashboard/report', '_blank');

  if (loading) return <div className="gd-loading">Caricamento dashboard...</div>;
  if (!data) return <div className="gd-error">Nessun dato disponibile</div>;

  const cropChartData = {
    labels: data.topCrops?.map(c => c.crop) || [],
    datasets: [{
      data: data.topCrops?.map(c => c.gardens) || [],
      backgroundColor: ['#4CAF50','#66BB6A','#81C784','#A5D6A7','#C8E6C9','#388E3C','#2E7D32','#1B5E20','#8BC34A','#CDDC39']
    }]
  };

  const historyChartData = history ? {
    labels: history.history?.map(h => new Date(h.timestamp).toLocaleDateString('it-IT')) || [],
    datasets: [{
      label: selectedMetric,
      data: history.history?.map(h => h.value) || [],
      borderColor: '#4CAF50',
      backgroundColor: 'rgba(76,175,80,0.1)',
      fill: true, tension: 0.3
    }]
  } : null;

  return (
    <div className="garden-dashboard">
      <div className="gd-header">
        <h2>Dashboard Orti Urbani</h2>
        <button onClick={handleExport} className="gd-export-btn">Esporta Report</button>
      </div>

      <div className="gd-summary-cards">
        <div className="gd-card">
          <span className="gd-card-label">Orti Attivi</span>
          <span className="gd-card-value">{data.summary.totalGardens}</span>
        </div>
        <div className="gd-card">
          <span className="gd-card-label">Area Totale</span>
          <span className="gd-card-value">{data.summary.totalArea_sqm?.toLocaleString()} m²</span>
        </div>
        <div className="gd-card">
          <span className="gd-card-label">Area Media</span>
          <span className="gd-card-value">{data.summary.avgArea_sqm?.toFixed(0)} m²</span>
        </div>
      </div>

      <div className="gd-charts">
        <div className="gd-chart-panel">
          <h3>Top 10 Colture</h3>
          <div className="gd-chart-body">
            <Doughnut data={cropChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="gd-chart-panel">
          <h3>Andamento Metriche</h3>
          <div className="gd-chart-controls">
            <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
              {['temperature','humidity','soil_moisture','soil_ph','light_level','water_usage','harvest_yield'].map(m => (
                <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
              ))}
            </select>
            <select value={timeRange} onChange={e => setTimeRange(parseInt(e.target.value))}>
              <option value={7}>7 giorni</option><option value={30}>30 giorni</option><option value={90}>90 giorni</option>
            </select>
          </div>
          <div className="gd-chart-body">
            {historyChartData && <Line data={historyChartData} options={{ responsive: true, maintainAspectRatio: false }} />}
          </div>
        </div>
      </div>

      <div className="gd-recent-metrics">
        <h3>Metriche Recenti</h3>
        <table><thead><tr><th>Timestamp</th><th>Metrica</th><th>Valore</th></tr></thead>
        <tbody>
          {data.recentMetrics?.slice(0,20).map((m,i) => (
            <tr key={i}><td>{new Date(m.timestamp).toLocaleString('it-IT')}</td><td>{m.metric}</td><td>{m.value} {m.unit}</td></tr>
          ))}
        </tbody></table>
      </div>

      <div className="gd-footer">Generato: {new Date(data.generatedAt).toLocaleString('it-IT')}</div>
    </div>
  );
}

export default GardenDashboard;
