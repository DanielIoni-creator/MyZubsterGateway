// web-dashboard/src/pages/Admin/Users.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Loader from '../../components/Loader';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Errore caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  const promoteUser = async (userId) => {
    if (!window.confirm('Promuovere questo utente ad amministratore?')) return;
    try {
      await api.put(`/admin/users/${userId}/promote`);
      toast.success('Utente promosso ad amministratore!');
      fetchUsers();
    } catch (error) {
      toast.error('Errore promozione utente');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>👥 Gestione Utenti</h1>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          Totale utenti: {users.length}
        </span>
      </div>

      <div style={{ margin: '20px 0' }}>
        <input
          type="text"
          placeholder="🔍 Cerca per email o nome"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '14px',
            width: '100%',
            maxWidth: '400px'
          }}
        />
      </div>

      <div className="orders-grid">
        {filteredUsers.map((user) => (
          <div key={user._id} className="order-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600' }}>{user.name || 'N/A'}</span>
              <span className={`order-status ${user.role === 'admin' ? 'paid' : 'pending'}`}>
                {user.role || 'user'}
              </span>
            </div>
            <div className="order-details">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user._id}</p>
              <p><strong>Registrato:</strong> {new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div className="order-actions">
              {user.role !== 'admin' && (
                <button
                  className="btn-pay"
                  onClick={() => promoteUser(user._id)}
                >
                  👑 Promuovi ad Admin
                </button>
              )}
              {user.role === 'admin' && (
                <button className="btn-disabled" disabled>
                  ✅ Già Admin
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Users;