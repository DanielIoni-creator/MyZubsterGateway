import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './GardenMap.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const gardenIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="16">🌱</text></svg>'),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function MapBoundsUpdater({ gardens }) {
  const map = useMap();
  useEffect(() => {
    if (gardens.length > 0) {
      const bounds = gardens.map(g => [g.geometry.coordinates[1], g.geometry.coordinates[0]]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gardens, map]);
  return null;
}

function GardenMap() {
  const [gardens, setGardens] = useState([]);
  const [filters, setFilters] = useState({ crop: '', minArea: '' });
  const [loading, setLoading] = useState(true);

  const fetchGardens = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.crop) params.append('crop', filters.crop);
      if (filters.minArea) params.append('minArea', filters.minArea);
      
      const res = await fetch(`/api/gardens?${params}`);
      const data = await res.json();
      setGardens(data.features || []);
    } catch (err) {
      console.error('Failed to fetch gardens:', err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchGardens(); }, [fetchGardens]);

  const handleExport = async (format) => {
    window.open(`/api/gardens/export/${format}`, '_blank');
  };

  return (
    <div className="garden-map-container">
      <div className="garden-map-controls">
        <input
          type="text"
          placeholder="Filtra per coltura (es. pomodori)..."
          value={filters.crop}
          onChange={e => setFilters(f => ({ ...f, crop: e.target.value }))}
          className="garden-search"
        />
        <input
          type="number"
          placeholder="Area minima (m²)..."
          value={filters.minArea}
          onChange={e => setFilters(f => ({ ...f, minArea: e.target.value }))}
          className="garden-search"
        />
        <button onClick={() => handleExport('csv')} className="garden-export-btn">Esporta CSV</button>
        <button onClick={() => handleExport('geojson')} className="garden-export-btn">Esporta GeoJSON</button>
      </div>
      
      {loading && <div className="garden-loading">Caricamento mappa...</div>}
      
      <MapContainer center={[41.9028, 12.4964]} zoom={6} className="garden-leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater gardens={gardens} />
        {gardens.map(garden => (
          <Marker
            key={garden.properties.id}
            position={[garden.geometry.coordinates[1], garden.geometry.coordinates[0]]}
            icon={gardenIcon}
          >
            <Popup>
              <div className="garden-popup">
                <h3>{garden.properties.name}</h3>
                <p>🌍 {garden.properties.area_sqm} m²</p>
                <p>🌿 {garden.properties.crops?.join(', ') || 'N/D'}</p>
                {garden.properties.description && <p>{garden.properties.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="garden-stats">
        {gardens.length} orti trovati
      </div>
    </div>
  );
}

export default GardenMap;
