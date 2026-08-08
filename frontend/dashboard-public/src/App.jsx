import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix per le icone di Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function App() {
  const [stats, setStats] = useState(null);
  const [gardens, setGardens] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Aggiorna ogni 30 secondi
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, gardensRes, chartRes] = await Promise.all([
        axios.get('/api/gardens/stats'),
        axios.get('/api/gardens'),
        axios.get('/api/gardens/chart')
      ]);
      setStats(statsRes.data);
      setGardens(gardensRes.data);
      setChartData(chartRes.data);
      setLoading(false);
    } catch (err) {
      setError('Errore nel caricamento dei dati');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-600 font-bold">⚠️ Errore</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🌱 Dashboard Orti Urbani</h1>
          <p className="text-green-100 mt-1">Monitoraggio in tempo reale degli orti urbani MyZubster</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Orti Attivi</h3>
            <p className="text-2xl font-bold text-green-600">{stats?.totalGardens || 0}</p>
            <span className="text-xs text-green-500">+{stats?.newGardens || 0} questa settimana</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Token in Circolazione</h3>
            <p className="text-2xl font-bold text-blue-600">{stats?.totalTokens || 0}</p>
            <span className="text-xs text-blue-500">{stats?.tokenGrowth || 0}% crescita</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Transazioni</h3>
            <p className="text-2xl font-bold text-purple-600">{stats?.totalTransactions || 0}</p>
            <span className="text-xs text-purple-500">Volume: {stats?.transactionVolume || 0} MYZ</span>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Contributors</h3>
            <p className="text-2xl font-bold text-orange-600">{stats?.totalContributors || 0}</p>
            <span className="text-xs text-orange-500">{stats?.activeContributors || 0} attivi oggi</span>
          </div>
        </div>

        {/* Mappa e Grafici */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Mappa */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">📍 Mappa degli Orti</h2>
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer
                center={[44.067, 12.569]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {gardens.map((garden) => (
                  <Marker key={garden.id} position={[garden.lat, garden.lng]}>
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">{garden.name}</h3>
                        <p className="text-sm text-gray-600">{garden.address}</p>
                        <p className="text-sm font-semibold text-green-600">
                          {garden.tokens} token
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Grafico */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">📈 Crescita Orti</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gardens" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
