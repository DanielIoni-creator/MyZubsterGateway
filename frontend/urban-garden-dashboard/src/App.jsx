import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const API_BASE = 'https://myzubstergateway-1.onrender.com/api';

function App() {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica gli orti
  const fetchGardens = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/gardens`);
      setGardens(response.data);
      setLoading(false);
    } catch (err) {
      setError('Errore nel caricamento degli orti');
      setLoading(false);
    }
  }, []);

  // Carica i dati sensori di un orto
  const fetchSensorData = useCallback(async (gardenId) => {
    try {
      const response = await axios.get(`${API_BASE}/gardens/${gardenId}/sensors`);
      setSensorData(response.data);
    } catch (err) {
      console.error('Errore nel caricamento dei sensori:', err);
    }
  }, []);

  useEffect(() => {
    fetchGardens();
  }, [fetchGardens]);

  useEffect(() => {
    if (selectedGarden) {
      fetchSensorData(selectedGarden.id);
      const interval = setInterval(() => fetchSensorData(selectedGarden.id), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedGarden, fetchSensorData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">📊 Dashboard Orti Urbani</h1>
            <div className="text-sm">
              <span className="bg-green-700 px-3 py-1 rounded-full">
                {gardens.length} orti totali
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Lista orti */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar con lista orti */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">🌱 I tuoi orti</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {gardens.map((garden) => (
                  <button
                    key={garden.id}
                    onClick={() => setSelectedGarden(garden)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedGarden?.id === garden.id
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{garden.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        garden.status === 'active' ? 'bg-green-200 text-green-800' :
                        garden.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {garden.status === 'active' ? 'Attivo' :
                         garden.status === 'pending' ? 'In attesa' : 'Inattivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{garden.address}</p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      <span>📍 {garden.tokens} token</span>
                      <span>👤 {garden.owner}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dettaglio orto selezionato */}
          <div className="lg:col-span-2">
            {selectedGarden ? (
              <div className="space-y-6">
                {/* Info orto */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-green-700">
                        {selectedGarden.name}
                      </h2>
                      <p className="text-gray-600">{selectedGarden.address}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Proprietario: {selectedGarden.owner}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedGarden.tokens} MYZ
                      </div>
                      <div className="text-sm text-gray-500">Token disponibili</div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                      💧 Irriga
                    </button>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                      📊 Report
                    </button>
                    <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                      ⚙️ Configura
                    </button>
                  </div>
                </div>

                {/* Sensori */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-bold text-lg mb-4">📡 Letture Sensori</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">Temperatura</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {sensorData[sensorData.length - 1]?.temperature || '--'}°C
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">Umidità</div>
                      <div className="text-2xl font-bold text-green-600">
                        {sensorData[sensorData.length - 1]?.humidity || '--'}%
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">pH</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {sensorData[sensorData.length - 1]?.ph || '--'}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">EC</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {sensorData[sensorData.length - 1]?.ec || '--'} mS/cm
                      </div>
                    </div>
                  </div>

                  {/* Grafico sensori */}
                  {sensorData.length > 0 && (
                    <div className="mt-6 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sensorData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="temperature" stroke="#3b82f6" name="Temperatura" />
                          <Line type="monotone" dataKey="humidity" stroke="#22c55e" name="Umidità" />
                          <Line type="monotone" dataKey="ph" stroke="#eab308" name="pH" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Storico transazioni */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-bold text-lg mb-4">📜 Storico Transazioni</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Data</th>
                          <th className="px-4 py-2 text-left">Tipo</th>
                          <th className="px-4 py-2 text-left">Importo</th>
                          <th className="px-4 py-2 text-left">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGarden.transactions?.map((tx, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{tx.type}</td>
                            <td className="px-4 py-2 font-medium text-green-600">
                              +{tx.amount} MYZ
                            </td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-xl font-semibold text-gray-700">
                  Seleziona un orto per vedere i dettagli
                </h3>
                <p className="text-gray-500 mt-2">
                  Scegli un orto dalla lista a sinistra per visualizzare i dati
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
