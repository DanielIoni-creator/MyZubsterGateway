import React, { useState, useEffect } from 'react';
import api from '../services/api';

export function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const data = await api.getBookings(userId);
      setBookings(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  };

  const filtered = filterBookings();

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      in_progress: 'purple',
      completed: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'gray';
  };

  return (
    <div className="bookings-container">
      <div className="header">
        <h1>📋 My Bookings</h1>
        <div className="filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={loadBookings}>🔄 Refresh</button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">❌ {error}</div>}

      {!loading && !error && (
        <div className="bookings-grid">
          {filtered.length === 0 ? (
            <div className="empty">No bookings found</div>
          ) : (
            filtered.map(booking => (
              <div key={booking.id} className="booking-card">
                <div className="card-header">
                  <h3>{booking.skillTitle}</h3>
                  <span className={`status ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Client:</strong> {booking.clientName}</p>
                  <p><strong>Professional:</strong> {booking.professionalName}</p>
                  <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {booking.timeSlot}</p>
                  <p><strong>Amount:</strong> €{booking.amount}</p>
                </div>
                <div className="card-footer">
                  <button onClick={() => window.location.href = `/booking/${booking.id}`}>
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}