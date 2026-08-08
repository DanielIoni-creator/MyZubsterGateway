import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Components
import ListingCard from './components/ListingCard';
import ListingFilters from './components/ListingFilters';

function App() {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch listings from MyZubster API
  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://188.213.161.186:4000/api/gardens');
      // Transform gardens into listings
      const transformedListings = response.data.data.map(garden => ({
        id: garden._id,
        name: garden.name,
        description: garden.description || 'EVA IONI Robot available for your garden',
        price: 0.05 + Math.random() * 0.15, // Mock price in XMR
        location: garden.city || 'Rimini, Italy',
        coordinates: garden.coordinates,
        status: 'available',
        image: 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=EVA+IONI',
        features: ['Autonomous', 'pH Monitoring', 'Irrigation'],
        createdAt: garden.createdAt
      }));
      setListings(transformedListings);
      setFilteredListings(transformedListings);
    } catch (err) {
      setError('Failed to load listings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filters) => {
    let filtered = [...listings];
    
    if (filters.search) {
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        l.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.location) {
      filtered = filtered.filter(l => 
        l.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(l => l.status === filters.status);
    }
    
    setFilteredListings(filtered);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading EVA IONI robots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>⚠️ {error}</h2>
        <button onClick={fetchListings}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌱 EVA IONI - Robot Listings</h1>
        <p>Find the perfect robot for your urban garden</p>
        <div className="stats">
          <span>🟢 {filteredListings.length} robots available</span>
          <span>📍 {listings.length} locations</span>
        </div>
      </header>

      <ListingFilters onFilter={handleFilter} />

      <div className="listings-grid">
        {filteredListings.length === 0 ? (
          <div className="no-results">
            <p>No robots found matching your criteria</p>
          </div>
        ) : (
          filteredListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        )}
      </div>
    </div>
  );
}

export default App;
