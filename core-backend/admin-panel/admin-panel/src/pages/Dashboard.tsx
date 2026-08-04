import React, { useState, useEffect } from 'react';

interface DashboardStats {
  users: number;
  bookings: number;
  revenue: number;
  pendingBookings: number;
  professionals: number;
  skills: number;
}

const mockApi = {
  getStats: async (): Promise<DashboardStats> => {
    return {
      users: 1250,
      bookings: 342,
      revenue: 25680,
      pendingBookings: 45,
      professionals: 89,
      skills: 156
    };
  }
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    bookings: 0,
    revenue: 0,
    pendingBookings: 0,
    professionals: 0,
    skills: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: '👥', color: 'blue' },
    { label: 'Total Bookings', value: stats.bookings, icon: '📋', color: 'green' },
    { label: 'Revenue', value: `€${stats.revenue}`, icon: '💰', color: 'gold' },
    { label: 'Pending', value: stats.pendingBookings, icon: '⏳', color: 'orange' },
    { label: 'Professionals', value: stats.professionals, icon: '👨‍💼', color: 'purple' },
    { label: 'Skills', value: stats.skills, icon: '🔧', color: 'teal' }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Admin Dashboard</h1>
        <button onClick={loadStats}>🔄 Refresh</button>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">❌ {error}</div>}

      {!loading && !error && (
        <>
          <div className="stats-grid">
            {statCards.map((stat, index) => (
              <div key={index} className={`stat-card ${stat.color}`}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>📈 Recent Activity</h2>
              <div className="activity-list">
                <div className="activity-item">New booking by user@email.com</div>
                <div className="activity-item">Payment received €150.00</div>
                <div className="activity-item">New professional registered</div>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>⚡ Quick Actions</h2>
              <div className="quick-actions">
                <button>👤 Manage Users</button>
                <button>📋 View Bookings</button>
                <button>🔧 Manage Skills</button>
                <button>💰 Payments</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}