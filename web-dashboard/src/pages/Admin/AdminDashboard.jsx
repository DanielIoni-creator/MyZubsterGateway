// web-dashboard/src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Loader from '../../components/Loader';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const limit = 10;

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        if (response.data.success) {
          setStats(response.data.stats);
        }
      } catch (error) {
        toast.error('Errore caricamento dashboard');
      }
    };
    fetchDashboard();
  }, []);

  // Fetch orders with filters and pagination
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchOrder) params.append('search', searchOrder);
      if (searchEmail) params.append('email', searchEmail);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(`/admin/orders?${params.toString()}`);
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalOrders(response.data.pagination?.total || 0);
      }
    } catch (error) {
      toast.error('Errore caricamento ordini');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchOrder, searchEmail, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchOrder, searchEmail]);

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    if (updating) return;
    setUpdating(true);
    try {
      await api.put(`/admin/orders/${orderId}`, { status });
      toast.success('Ordine aggiornato con successo');
      fetchOrders();
    } catch (error) {
      toast.error('Errore aggiornamento ordine');
    } finally {
      setUpdating(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('');
    setSearchOrder('');
    setSearchEmail('');
    setPage(1);
  };

  // Open order details modal
  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Export orders to CSV
  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      toast.warning('Nessun ordine da esportare');
      return;
    }
    const headers = ['OrderNumber', 'Utente', 'Totale', 'Valuta', 'Stato', 'Pagamento', 'Data'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.userId?.email || 'N/A',
      order.total,
      order.currency,
      order.status,
      order.paymentStatus,
      new Date(order.createdAt).toLocaleString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV esportato con successo!');
  };

  // OrderDetailsModal component
  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '22px' }}>📋 Dettagli Ordine</h2>
            <button
              onClick={() => setShowOrderModal(false)}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
            >
              ✕
            </button>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p><strong>Order Number:</strong> {selectedOrder.orderNumber}</p>
            <p><strong>Stato:</strong> <span className={`order-status ${selectedOrder.status}`}>{selectedOrder.status}</span></p>
            <p><strong>Utente:</strong> {selectedOrder.userId?.name || selectedOrder.userId?.email || 'N/A'}</p>
            <p><strong>Totale:</strong> {selectedOrder.total} {selectedOrder.currency}</p>
            <p><strong>Pagamento:</strong> {selectedOrder.paymentStatus}</p>
            <p><strong>Items:</strong> {selectedOrder.items?.length || 0}</p>
            <p><strong>Creato:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
          </div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>🛒 Items</h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            {selectedOrder.items?.map((item, idx) => (
              <li key={idx}>{item.name} x{item.quantity} = {item.price * item.quantity} {selectedOrder.currency}</li>
            ))}
          </ul>
          <button
            onClick={() => setShowOrderModal(false)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  };

  if (loading && !orders.length) return <Loader fullScreen />;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>🛡️ Admin Panel</h1>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>Totale ordini: {totalOrders} | Pagina {page} di {totalPages}</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card" style={{ background: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
            <h3>📦 Ordini totali</h3>
            <p className="stat-value">{stats.totalOrders}</p>
          </div>
          <div className="stat-card" style={{ background: '#e8f5e9', borderLeft: '4px solid #388e3c' }}>
            <h3>✅ Pagati</h3>
            <p className="stat-value">{stats.paidOrders}</p>
          </div>
          <div className="stat-card" style={{ background: '#fff3e0', borderLeft: '4px solid #f57c00' }}>
            <h3>⏳ In attesa</h3>
            <p className="stat-value">{stats.pendingOrders}</p>
          </div>
          <div className="stat-card" style={{ background: '#f3e5f5', borderLeft: '4px solid #7b1fa2' }}>
            <h3>💰 Totale incasso</h3>
            <p className="stat-value">{stats.totalRevenue || 0} XMR</p>
          </div>
          <div className="stat-card" style={{ background: '#fce4ec', borderLeft: '4px solid #c62828' }}>
            <h3>👥 Utenti</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
          <div className="stat-card" style={{ background: '#e0f7fa', borderLeft: '4px solid #00838f' }}>
            <h3>📊 Conversione</h3>
            <p className="stat-value">{stats.conversionRate || 0}%</p>
          </div>
        </div>
      )}

      {/* Filters and search */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#f8f9fa',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            background: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '140px'
          }}
        >
          <option value="">📋 Tutti gli stati</option>
          <option value="pending">⏳ In attesa</option>
          <option value="paid">✅ Pagato</option>
          <option value="processing">🔄 In elaborazione</option>
          <option value="shipped">📦 Spedito</option>
          <option value="delivered">✅ Consegnato</option>
          <option value="cancelled">❌ Annullato</option>
        </select>

        <input
          type="text"
          placeholder="🔍 Cerca per orderNumber"
          value={searchOrder}
          onChange={(e) => setSearchOrder(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            background: 'white',
            fontSize: '14px',
            flex: '1',
            minWidth: '180px'
          }}
        />

        <input
          type="text"
          placeholder="✉️ Cerca per email utente"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            background: 'white',
            fontSize: '14px',
            flex: '1',
            minWidth: '180px'
          }}
        />

        <button
          onClick={() => { setPage(1); fetchOrders(); }}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#4f46e5',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🔍 Cerca
        </button>

        <button
          onClick={resetFilters}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            background: '#f3f4f6',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Reset
        </button>

        <button
          onClick={exportOrdersCSV}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#10b981',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          📥 Esporta CSV
        </button>
      </div>

      {/* Orders list */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
        📋 Ordini {statusFilter && `(${statusFilter})`}
        {searchOrder && ` - Ricerca: ${searchOrder}`}
        {searchEmail && ` - Utente: ${searchEmail}`}
      </h2>

      {loading ? (
        <Loader />
      ) : orders.length === 0 ? (
        <div className="empty-state"><p>Nessun ordine trovato</p></div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div
              key={order._id}
              className="order-card fade-in"
              style={{ cursor: 'pointer' }}
              onClick={() => openOrderDetails(order)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="order-number" style={{ fontWeight: '600' }}>{order.orderNumber}</span>
                <span className={`order-status ${order.status}`}>{order.status}</span>
              </div>
              <div className="order-details" style={{ marginTop: '12px' }}>
                <p><strong>Utente:</strong> {order.userId?.name || order.userId?.email || 'N/A'}</p>
                <p><strong>Totale:</strong> {order.total} {order.currency}</p>
                <p><strong>Items:</strong> {order.items?.length || 0}</p>
                <p><strong>Pagamento:</strong> {order.paymentStatus}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="order-actions" style={{ marginTop: '12px' }}>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                  disabled={updating}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="pending">⏳ In attesa</option>
                  <option value="paid">✅ Pagato</option>
                  <option value="processing">🔄 In elaborazione</option>
                  <option value="shipped">📦 Spedito</option>
                  <option value="delivered">✅ Consegnato</option>
                  <option value="cancelled">❌ Annullato</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              background: page === 1 ? '#f3f4f6' : 'white',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            ◀ Precedente
          </button>
          <span style={{ padding: '8px 16px', fontWeight: '600' }}>Pagina {page} di {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              background: page === totalPages ? '#f3f4f6' : 'white',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1
            }}
          >
            Successivo ▶
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && <OrderDetailsModal />}
    </div>
  );
};

export default AdminDashboard;