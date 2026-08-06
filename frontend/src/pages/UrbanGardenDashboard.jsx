import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UrbanGardenDashboard.css';

const UrbanGardenDashboard = () => {
  const [gardenData, setGardenData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gardenId, setGardenId] = useState('orto-rimini-001');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, [gardenId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, latestRes, statsRes] = await Promise.all([
        axios.get(`/api/sensors/garden/${gardenId}`),
        axios.get(`/api/sensors/garden/${gardenId}/latest`),
        axios.get(`/api/sensors/garden/${gardenId}/stats`)
      ]);
      
      setGardenData(historyRes.data.data || []);
      setLatestData(latestRes.data.data || null);
      setStats(statsRes.data.data || null);
    } catch (error) {
      console.error('Error fetching garden data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">🌱 Caricamento dati orto...</div>;
  }

  return (
    <div className="urban-garden-dashboard">
      <header className="dashboard-header">
        <h1>🌱 Orto Urbano - Rimini</h1>
        <p>Monitoraggio in tempo reale dei parametri del suolo</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card ph">
          <h3>pH</h3>
          <div className="value">{latestData?.ph || '--'}</div>
          <div className="range">6.0 - 7.5 (ottimale)</div>
        </div>
        
        <div className="stat-card ec">
          <h3>EC (Conducibilità)</h3>
          <div className="value">{latestData?.ec || '--'}</div>
          <div className="range">0.8 - 2.0 (ottimale)</div>
        </div>
        
        <div className="stat-card temperature">
          <h3>🌡️ Temperatura</h3>
          <div className="value">{latestData?.temperature || '--'}°C</div>
          <div className="range">15 - 25°C (ottimale)</div>
        </div>
        
        <div className="stat-card humidity">
          <h3>💧 Umidità</h3>
          <div className="value">{latestData?.humidity || '--'}%</div>
          <div className="range">40 - 70% (ottimale)</div>
        </div>
      </div>

      <div className="history-section">
        <h2>📊 Storico dati</h2>
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
              {gardenData.slice(0, 20).map((reading, index) => (
                <tr key={index}>
                  <td>{new Date(reading.timestamp).toLocaleString()}</td>
                  <td>{reading.ph}</td>
                  <td>{reading.ec}</td>
                  <td>{reading.temperature}°C</td>
                  <td>{reading.humidity}%</td>
                </tr>
              ))}
              {gardenData.length === 0 && (
                <tr>
                  <td colSpan="5">Nessun dato disponibile</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-section">
        <h2>📈 Statistiche</h2>
        {stats ? (
          <div className="stats-details">
            <div>
              <strong>pH medio:</strong> {stats.ph?.avg?.toFixed(2) || '--'}
            </div>
            <div>
              <strong>EC medio:</strong> {stats.ec?.avg?.toFixed(2) || '--'}
            </div>
            <div>
              <strong>Temperatura media:</strong> {stats.temperature?.avg?.toFixed(1) || '--'}°C
            </div>
            <div>
              <strong>Letture totali:</strong> {stats.readings || 0}
            </div>
          </div>
        ) : (
          <p>Statistiche non disponibili</p>
        )}
      </div>
    </div>
  );
};

export default UrbanGardenDashboard;
