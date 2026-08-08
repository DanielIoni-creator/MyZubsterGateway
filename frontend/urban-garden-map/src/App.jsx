import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix per le icone di Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Icona personalizzata per gli orti
const gardenIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBkPSJNMTYgMkM4LjI2OCAyIDIgOC4yNjggMiAxNnM2LjI2OCAxNCAxNCAxNCAxNC02LjI2OCAxNC0xNFMyMy43MzIgMiAxNiAyem0wIDI4QzguMjY4IDMwIDIgMjMuNzMyIDIgMTZzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjMjJjNTVlIi8+PHBhdGggZD0iTTE2IDZ2MTBsMTAgMTAgMjAtMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function App() {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Carica i dati degli orti
  const fetchGardens = useCallback(async () => {
    try {
      const response = await axios.get('https://myzubstergateway-1.onrender.com/api/gardens');
      setGardens(response.data);
      setLoading(false);
    } catch (err) {
      setError('Errore nel caricamento degli orti');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGardens();
    const interval = setInterval(fetchGardens, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, [fetchGardens]);

  // Filtra gli orti
  const filteredGardens = gardens.filter(garden => {
    const matchesFilter = filter === 'all' || garden.status === filter;
    const matchesSearch = garden.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          garden.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento mappa orti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-600 font-bold">⚠️ Errore</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={fetchGardens}
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🗺️ Mappa Orti Urbani</h1>
            <div className="text-sm">
              <span className="bg-green-700 px-3 py-1 rounded-full">
                {filteredGardens.length} orti
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Controlli */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Cerca per nome o indirizzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tutti gli orti</option>
            <option value="active">Attivi</option>
            <option value="pending">In attesa</option>
            <option value="inactive">Inattivi</option>
          </select>
        </div>
      </div>

      {/* Mappa */}
      <div className="container mx-auto px-4 pb-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-[600px]">
            <MapContainer
              center={[44.067, 12.569]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {filteredGardens.map((garden) => (
                <Marker
                  key={garden.id}
                  position={[garden.lat, garden.lng]}
                  icon={gardenIcon}
                  eventHandlers={{
                    click: () => setSelectedGarden(garden),
                  }}
                >
                  <Popup>
                    <div className="p-2 max-w-xs">
                      <h3 className="font-bold text-lg text-green-700">{garden.name}</h3>
                      <p className="text-sm text-gray-600">{garden.address}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold">Token:</span>
                          <span className="ml-1 text-green-600">{garden.tokens}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Stato:</span>
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            garden.status === 'active' ? 'bg-green-100 text-green-800' :
                            garden.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {garden.status === 'active' ? 'Attivo' :
                             garden.status === 'pending' ? 'In attesa' : 'Inattivo'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-semibold">Proprietario:</span>
                          <span className="ml-1">{garden.owner}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/garden/${garden.id}`, '_blank')}
                        className="mt-2 w-full bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Vedi dettagli
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Dettaglio orto selezionato */}
      {selectedGarden && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl p-4 z-50">
          <button
            onClick={() => setSelectedGarden(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <h3 className="font-bold text-lg text-green-700">{selectedGarden.name}</h3>
          <p className="text-sm text-gray-600">{selectedGarden.address}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-semibold">Token:</span>
              <span className="ml-1 text-green-600">{selectedGarden.tokens}</span>
            </div>
            <div>
              <span className="font-semibold">Stato:</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                selectedGarden.status === 'active' ? 'bg-green-100 text-green-800' :
                selectedGarden.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedGarden.status === 'active' ? 'Attivo' :
                 selectedGarden.status === 'pending' ? 'In attesa' : 'Inattivo'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Proprietario:</span>
              <span className="ml-1">{selectedGarden.owner}</span>
            </div>
            {selectedGarden.description && (
              <div className="col-span-2 mt-1">
                <p className="text-sm text-gray-600">{selectedGarden.description}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => window.open(`/garden/${selectedGarden.id}`, '_blank')}
            className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Vedi dettagli completi
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
