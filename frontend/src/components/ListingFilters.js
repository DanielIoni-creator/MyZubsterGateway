import React, { useState } from 'react';

const ListingFilters = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    status: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    setFilters({ search: '', location: '', status: '' });
    onFilter({ search: '', location: '', status: '' });
  };

  return (
    <div className="filters-container">
      <input
        type="text"
        name="search"
        placeholder="🔍 Search robots..."
        value={filters.search}
        onChange={handleChange}
        className="filter-input"
      />
      
      <input
        type="text"
        name="location"
        placeholder="📍 Filter by location..."
        value={filters.location}
        onChange={handleChange}
        className="filter-input"
      />
      
      <select
        name="status"
        value={filters.status}
        onChange={handleChange}
        className="filter-select"
      >
        <option value="">All Status</option>
        <option value="available">✅ Available</option>
        <option value="rented">🔴 Rented</option>
      </select>
      
      <button onClick={clearFilters} className="clear-button">
        🗑️ Clear
      </button>
    </div>
  );
};

export default ListingFilters;
