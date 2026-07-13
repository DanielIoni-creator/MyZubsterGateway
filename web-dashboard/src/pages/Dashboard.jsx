// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { getOrders, createOrder, startPayment, getPaymentStatus, cancelOrder } from '../services/api';

const Dashboard = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState({ items: [{ name: '', quantity: 1, price: 0 }], total: 0 });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await getOrders();
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const response = await createOrder(
        newOrder.items,
        newOrder.total,
        'XMR'
      );
      alert(`Ordine creato! ID: ${response.data.order.orderNumber}`);
      setNewOrder({ items: [{ name: '', quantity: 1, price: 0 }], total: 0 });
      loadOrders();
    } catch (error) {
      alert('Errore creazione ordine: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePayOrder = async (orderId, amount) => {
    try {
      const response = await startPayment(orderId, amount);
      const paymentId = response.data.payment.id;
      alert(`Pagamento avviato! Payment ID: ${paymentId}`);
      
      setTimeout(async () => {
        try {
          const statusRes = await getPaymentStatus(paymentId);
          alert(`Stato pagamento: ${statusRes.data.status}`);
          loadOrders();
        } catch (err) {
          console.error('Errore verifica stato:', err);
        }
      }, 4000);
    } catch (error) {
      alert('Errore pagamento: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Annullare questo ordine?')) return;
    try {
      await cancelOrder(orderId);
      alert('Ordine annullato!');
      loadOrders();
    } catch (error) {
      alert('Errore annullamento: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}>Caricamento ordini...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Benvenuto, {user?.name || 'Utente'}!</h2>
        <button onClick={onLogout} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <h3>I tuoi ordini</h3>
      {orders.length === 0 ? (
        <p>Nessun ordine trovato.</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} style={{ border: '1px solid #ddd', padding: 15, marginBottom: 10, borderRadius: 8 }}>
            <p><strong>Ordine:</strong> {order.orderNumber}</p>
            <p><strong>Stato:</strong> <span style={{ fontWeight: 'bold', color: order.status === 'paid' ? 'green' : 'orange' }}>{order.status}</span></p>
            <p><strong>Totale:</strong> {order.total} {order.currency}</p>
            <p><strong>Items:</strong> {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
            <div style={{ marginTop: 10 }}>
              {order.status === 'pending' && (
                <>
                  <button onClick={() => handlePayOrder(order._id, order.total)} style={{ marginRight: 10, padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Paga {order.total} {order.currency}
                  </button>
                  <button onClick={() => handleCancelOrder(order._id)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Annulla
                  </button>
                </>
              )}
              {order.status === 'paid' && <span style={{ color: 'green' }}>✅ Pagato</span>}
            </div>
          </div>
        ))
      )}

      <h3>Nuovo ordine</h3>
      <form onSubmit={handleCreateOrder} style={{ border: '1px solid #ddd', padding: 15, borderRadius: 8 }}>
        {newOrder.items.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              placeholder="Nome prodotto"
              value={item.name}
              onChange={(e) => {
                const items = [...newOrder.items];
                items[index].name = e.target.value;
                setNewOrder({ ...newOrder, items });
              }}
              required
              style={{ flex: 2, padding: 8, boxSizing: 'border-box' }}
            />
            <input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => {
                const items = [...newOrder.items];
                items[index].quantity = parseInt(e.target.value) || 1;
                setNewOrder({ ...newOrder, items });
              }}
              required
              min="1"
              style={{ flex: 1, padding: 8, boxSizing: 'border-box' }}
            />
            <input
              type="number"
              placeholder="Prezzo"
              value={item.price}
              onChange={(e) => {
                const items = [...newOrder.items];
                items[index].price = parseFloat(e.target.value) || 0;
                const total = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                setNewOrder({ ...newOrder, items, total });
              }}
              required
              min="0"
              step="0.01"
              style={{ flex: 1, padding: 8, boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => {
                const items = newOrder.items.filter((_, i) => i !== index);
                const total = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                setNewOrder({ ...newOrder, items, total });
              }}
              style={{ padding: '0 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const items = [...newOrder.items, { name: '', quantity: 1, price: 0 }];
            setNewOrder({ ...newOrder, items });
          }}
          style={{ marginBottom: 10, padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          + Aggiungi item
        </button>
        <div style={{ marginTop: 10 }}>
          <p><strong>Totale:</strong> {newOrder.total} XMR</p>
          <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Crea Ordine
          </button>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;