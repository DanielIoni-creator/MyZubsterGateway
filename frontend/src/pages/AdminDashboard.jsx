import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch admin stats
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.log('Using demo data');
        setStats({
          users: { total: 1234, active: 567, new: 42 },
          orders: { total: 8901, pending: 23, completed: 8878 },
          bounties: { total: 456, open: 89, claimed: 312, completed: 55 },
          revenue: { total: '12,450 MYZ', monthly: '3,200 MYZ' }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'users', label: '👥 Users', icon: '👥' },
    { id: 'orders', label: '📦 Orders', icon: '📦' },
    { id: 'bounties', label: '🏆 Bounties', icon: '🏆' },
    { id: 'logs', label: '📋 System Logs', icon: '📋' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <span className="admin-badge">Admin</span>
      </header>

      <nav className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {activeTab === 'overview' && (
          <section className="overview-section">
            <h2>Key Metrics</h2>
            <div className="stats-grid">
              <div className="stat-card users">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{stats.users.total.toLocaleString()}</div>
                <div className="stat-label">Total Users</div>
                <div className="stat-detail">
                  <span className="positive">+{stats.users.new}</span> new this week
                </div>
              </div>

              <div className="stat-card orders">
                <div className="stat-icon">📦</div>
                <div className="stat-value">{stats.orders.total.toLocaleString()}</div>
                <div className="stat-label">Total Orders</div>
                <div className="stat-detail">{stats.orders.pending} pending</div>
              </div>

              <div className="stat-card bounties">
                <div className="stat-icon">🏆</div>
                <div className="stat-value">{stats.bounties.total}</div>
                <div className="stat-label">Total Bounties</div>
                <div className="stat-detail">{stats.bounties.open} open</div>
              </div>

              <div className="stat-card revenue">
                <div className="stat-icon">💰</div>
                <div className="stat-value">{stats.revenue.total}</div>
                <div className="stat-label">Total Revenue</div>
                <div className="stat-detail">{stats.revenue.monthly} this month</div>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <h3>User Growth</h3>
                <div className="mini-bar-chart">
                  {[320, 450, 580, 720, 890, 1050, 1234].map((val, i) => (
                    <div key={i} className="bar-wrapper">
                      <div className="bar" style={{ height: `${(val / 1234) * 100}%` }}>
                        <span className="bar-value">{val}</span>
                      </div>
                      <span className="bar-label">W{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <h3>Bounty Status</h3>
                <div className="bounty-status-grid">
                  <div className="bs-item open">
                    <span className="bs-count">{stats.bounties.open}</span>
                    <span className="bs-label">Open</span>
                  </div>
                  <div className="bs-item claimed">
                    <span className="bs-count">{stats.bounties.claimed}</span>
                    <span className="bs-label">Claimed</span>
                  </div>
                  <div className="bs-item completed">
                    <span className="bs-count">{stats.bounties.completed}</span>
                    <span className="bs-label">Completed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="activity-feed">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-time">2 min ago</span>
                  <span className="activity-desc">New user registered: marco_verdi</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">15 min ago</span>
                  <span className="activity-desc">Bounty #889 claimed by laurentketterle-hub</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">1 hour ago</span>
                  <span className="activity-desc">Order #8901 completed — 50 MYZ</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">2 hours ago</span>
                  <span className="activity-desc">PR #923 opened: Dockerize All Services</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="users-section">
            <h2>User Management</h2>
            <div className="table-controls">
              <input type="text" placeholder="🔍 Search users..." className="search-input" />
              <select className="filter-select">
                <option>All Users</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Banned</option>
              </select>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>MYZ Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#1001</td>
                  <td>marco_verdi</td>
                  <td><span className="role user">User</span></td>
                  <td>250 MYZ</td>
                  <td><span className="status active">Active</span></td>
                  <td>
                    <button className="action-btn edit" title="Edit">✏️</button>
                    <button className="action-btn ban" title="Ban">🚫</button>
                  </td>
                </tr>
                <tr>
                  <td>#1002</td>
                  <td>laurentketterle-hub</td>
                  <td><span className="role contributor">Contributor</span></td>
                  <td>5,200 MYZ</td>
                  <td><span className="status active">Active</span></td>
                  <td>
                    <button className="action-btn edit" title="Edit">✏️</button>
                    <button className="action-btn ban" title="Ban">🚫</button>
                  </td>
                </tr>
                <tr>
                  <td>#1003</td>
                  <td>foxxx009</td>
                  <td><span className="role contributor">Contributor</span></td>
                  <td>750 MYZ</td>
                  <td><span className="status active">Active</span></td>
                  <td>
                    <button className="action-btn edit" title="Edit">✏️</button>
                    <button className="action-btn ban" title="Ban">🚫</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="orders-section">
            <h2>Order Tracking</h2>
            <div className="table-controls">
              <input type="text" placeholder="🔍 Search orders..." className="search-input" />
              <select className="filter-select">
                <option>All Orders</option>
                <option>Pending</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#8901</td>
                  <td>marco_verdi</td>
                  <td>50 MYZ</td>
                  <td>Seed Exchange</td>
                  <td><span className="status completed">Completed</span></td>
                  <td>2026-08-08</td>
                </tr>
                <tr>
                  <td>#8900</td>
                  <td>garden_lover</td>
                  <td>120 MYZ</td>
                  <td>Plant Sale</td>
                  <td><span className="status pending">Pending</span></td>
                  <td>2026-08-08</td>
                </tr>
                <tr>
                  <td>#8899</td>
                  <td>green_thumb</td>
                  <td>75 MYZ</td>
                  <td>Escrow</td>
                  <td><span className="status completed">Completed</span></td>
                  <td>2026-08-07</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'bounties' && (
          <section className="bounties-section">
            <h2>Bounty Management</h2>
            <div className="bounty-actions-bar">
              <button className="btn-primary">+ New Bounty</button>
              <select className="filter-select">
                <option>All Bounties</option>
                <option>Open</option>
                <option>Claimed</option>
                <option>Completed</option>
              </select>
            </div>
            <div className="bounty-list-admin">
              {[
                { id: 889, title: 'Fix Security Vulnerability', reward: '500 MYZ', status: 'claimed', assignee: 'laurentketterle-hub' },
                { id: 884, title: 'Dockerize All Services', reward: '500 MYZ', status: 'claimed', assignee: 'laurentketterle-hub' },
                { id: 865, title: 'Onboarding Guide', reward: '100 MYZ', status: 'open', assignee: '-' }
              ].map(b => (
                <div key={b.id} className="bounty-card-admin">
                  <div className="bounty-card-header">
                    <span className="bounty-id">#{b.id}</span>
                    <span className={`bounty-status ${b.status}`}>{b.status}</span>
                  </div>
                  <h4>{b.title}</h4>
                  <div className="bounty-meta">
                    <span>💰 {b.reward}</span>
                    <span>👤 {b.assignee}</span>
                  </div>
                  <div className="bounty-actions">
                    <button className="btn-small">Review</button>
                    <button className="btn-small danger">Close</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="logs-section">
            <h2>System Logs</h2>
            <div className="log-controls">
              <select className="filter-select">
                <option>All Levels</option>
                <option>ERROR</option>
                <option>WARN</option>
                <option>INFO</option>
              </select>
              <button className="btn-small">Clear Logs</button>
            </div>
            <div className="log-viewer">
              <div className="log-entry error">
                <span className="log-time">15:28:34</span>
                <span className="log-level">ERROR</span>
                <span className="log-msg">Payment verification timeout for order #8899</span>
              </div>
              <div className="log-entry warn">
                <span className="log-time">15:27:12</span>
                <span className="log-level">WARN</span>
                <span className="log-msg">Rate limit approaching: 85% of API quota used</span>
              </div>
              <div className="log-entry info">
                <span className="log-time">15:26:45</span>
                <span className="log-level">INFO</span>
                <span className="log-msg">Bounty #146 assigned to laurentketterle-hub</span>
              </div>
              <div className="log-entry info">
                <span className="log-time">15:25:01</span>
                <span className="log-level">INFO</span>
                <span className="log-msg">New PR #923 opened by laurentketterle-hub</span>
              </div>
              <div className="log-entry info">
                <span className="log-time">15:22:18</span>
                <span className="log-level">INFO</span>
                <span className="log-msg">User marco_verdi completed onboarding</span>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-section">
            <h2>Admin Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <h3>🔐 Security</h3>
                <label>Two-Factor Authentication</label>
                <input type="checkbox" defaultChecked />
                <label>Session Timeout (minutes)</label>
                <input type="number" defaultValue={30} />
                <label>IP Whitelist</label>
                <input type="text" placeholder="192.168.1.0/24" />
              </div>
              <div className="setting-card">
                <h3>📧 Notifications</h3>
                <label>Email Alerts</label>
                <input type="checkbox" defaultChecked />
                <label>New Bounty Alerts</label>
                <input type="checkbox" defaultChecked />
                <label>Weekly Report</label>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="setting-card">
                <h3>🔌 API</h3>
                <label>Rate Limit (req/min)</label>
                <input type="number" defaultValue={60} />
                <label>Webhook URL</label>
                <input type="text" placeholder="https://..." />
                <button className="btn-primary">Save Settings</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
