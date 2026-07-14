// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { getOrders, createOrder, startPayment, getPaymentStatus, cancelOrder } from '../services/api';

const Dashboard = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ 
    items: [{ name: '', quantity: 1, price: 0 }], 
    total: 0 
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await getOrders();
      setOrders(response.data.orders || []);
    } catch (error) {
      toast.error('Errore caricamento ordini');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (newOrder.items.some(item => !item.name || item.price <= 0)) {
      toast.warning('Compila tutti i campi correttamente');
      return;
    }
    setCreating(true);
    try {
      const response = await createOrder(
        newOrder.items,
        newOrder.total,
        'XMR'
      );
      toast.success(`Ordine creato! ID: ${response.data.order.orderNumber}`);
      setNewOrder({ items: [{ name: '', quantity: 1, price: 0 }], total: 0 });
      await loadOrders();
      
      // Avvia automaticamente il pagamento
      const orderId = response.data.order.id;
      await handleStartPayment(orderId, newOrder.total);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore creazione ordine');
    } finally {
      setCreating(false);
    }
  };

  const handleStartPayment = async (orderId, amount) => {
    setPaying(true);
    try {
      const response = await startPayment(orderId, amount);
      const payment = response.data.payment;
      
      // Mostra il modal con i dettagli del pagamento
      setSelectedPayment({
        ...payment,
        orderId: orderId,
        confirmations: 0,
        maxConfirmations: 10,
      });
      setShowPaymentModal(true);
      
      toast.info(`Pagamento avviato! Invia ${payment.amount} XMR al seguente indirizzo.`);
      
      // Avvia il monitoraggio in background (ogni 10 secondi per 10 minuti)
      let attempts = 0;
      const maxAttempts = 60;
      
      const checkPaymentStatus = async () => {
        attempts++;
        try {
          const statusRes = await getPaymentStatus(payment.id);
          if (statusRes.data.status === 'confirmed') {
            toast.success('✅ Pagamento confermato!');
            await loadOrders();
            setShowPaymentModal(false);
            setSelectedPayment(null);
            setPaying(false);
            return;
          } else if (statusRes.data.status === 'pending') {
            // Aggiorna il modal con lo stato corrente
            setSelectedPayment(prev => ({
              ...prev,
              confirmations: statusRes.data.confirmations || 0,
              maxConfirmations: statusRes.data.maxConfirmations || 10,
            }));
          }
        } catch (err) {
          console.log('Monitoraggio in corso...');
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkPaymentStatus, 10000); // Riprova tra 10 secondi
        } else {
          toast.info('⏳ Il pagamento richiede ~20 minuti. Controlla più tardi.');
          setPaying(false);
        }
      };
      
      setTimeout(checkPaymentStatus, 5000);
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore pagamento');
      setPaying(false);
    }
  };

  const handlePayOrder = async (orderId, amount) => {
    await handleStartPayment(orderId, amount);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Annullare questo ordine?')) return;
    try {
      await cancelOrder(orderId);
      toast.success('Ordine annullato!');
      await loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Errore annullamento');
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setPaying(false);
  };

  const addItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { name: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (index) => {
    const items = newOrder.items.filter((_, i) => i !== index);
    const total = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
    setNewOrder({ ...newOrder, items, total });
  };

  const updateItem = (index, field, value) => {
    const items = [...newOrder.items];
    items[index][field] = value;
    const total = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
    setNewOrder({ ...newOrder, items, total });
  };

  // Componente per il modal di pagamento
  const PaymentModal = () => {
    if (!selectedPayment) return null;

    const currencySymbol = selectedPayment.currency || 'XMR';
    const confirmations = selectedPayment.confirmations || 0;
    const maxConfirmations = selectedPayment.maxConfirmations || 10;
    const progress = Math.min(100, (confirmations / maxConfirmations) * 100);
    const isConfirmed = selectedPayment.status === 'confirmed';

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '450px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1a1a2e' }}>
              {isConfirmed ? '✅ Pagamento confermato!' : '💳 Pagamento ' + currencySymbol}
            </h3>
            <button
              onClick={handleClosePaymentModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          </div>

          {/* Stato del pagamento */}
          {!isConfirmed && confirmations > 0 && (
            <div style={{
              background: '#f0fdf4',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              border: '1px solid #bbf7d0'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                🔄 Pagamento in corso: {confirmations}/{maxConfirmations} conferme
              </p>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#dcfce7',
                borderRadius: '3px',
                marginTop: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#22c55e',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          )}

          {isConfirmed && (
            <div style={{
              background: '#dcfce7',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              border: '1px solid #bbf7d0',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '16px', color: '#166534', fontWeight: '600' }}>
                🎉 Pagamento ricevuto e confermato!
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '12px',
              marginBottom: '15px'
            }}>
              <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '14px' }}>
                Importo da inviare
              </p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e' }}>
                {selectedPayment.amount} {currencySymbol}
              </p>
              {selectedPayment.fee && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Fee inclusa: {selectedPayment.fee} {currencySymbol} (2%)
                </p>
              )}
            </div>

            {/* QR Code */}
            {!isConfirmed && (
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '12px',
                display: 'inline-block',
                border: '2px solid #e5e7eb'
              }}>
                <QRCodeSVG
                  value={selectedPayment.address}
                  size={200}
                  level="L"
                  includeMargin={true}
                />
              </div>
            )}

            {/* Indirizzo */}
            {!isConfirmed && (
              <div style={{
                marginTop: '15px',
                background: '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
                wordBreak: 'break-all'
              }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280' }}>
                  Indirizzo di pagamento
                </p>
                <p style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#1a1a2e' }}>
                  {selectedPayment.address}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPayment.address);
                    toast.success('Indirizzo copiato!');
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 16px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📋 Copia indirizzo
                </button>
              </div>
            )}

            {!isConfirmed && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '15px' }}>
                ⏳ Il pagamento verrà confermato automaticamente dopo 10 conferme (~20 minuti)
              </p>
            )}
          </div>

          <button
            onClick={handleClosePaymentModal}
            style={{
              width: '100%',
              padding: '12px',
              background: isConfirmed ? '#22c55e' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isConfirmed ? '✅ Pagamento completato!' : 'Ho capito, aspetto il pagamento'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>📦 MyZubster</h1>
        <div className="user-info">
          <span>👋 {user?.name || 'Utente'}</span>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <h2 className="section-title">I tuoi ordini</h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>Nessun ordine</h3>
          <p>Non hai ancora creato ordini. Inizia qui sotto!</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="order-number">{order.orderNumber}</span>
                <span className={`order-status ${order.status}`}>
                  {order.status}
                </span>
              </div>
              <div className="order-details">
                <p><strong>Totale:</strong> {order.total} {order.currency}</p>
                <p><strong>Items:</strong> {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
                {order.paymentStatus === 'confirmed' && (
                  <p style={{ color: '#059669', fontWeight: 600 }}>✅ Pagato</p>
                )}
                {order.paymentId && order.paymentStatus === 'pending' && (
                  <p style={{ color: '#d97706', fontWeight: 600 }}>
                    ⏳ In attesa di pagamento
                  </p>
                )}
              </div>
              <div className="order-actions">
                {order.status === 'pending' && order.paymentStatus !== 'confirmed' && (
                  <>
                    <button 
                      className="btn-pay" 
                      onClick={() => handlePayOrder(order._id, order.total)}
                      disabled={paying}
                    >
                      {paying ? '⏳' : `Paga ${order.total} ${order.currency}`}
                    </button>
                    <button 
                      className="btn-cancel" 
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Annulla
                    </button>
                  </>
                )}
                {order.status === 'paid' && (
                  <button className="btn-disabled" disabled>
                    ✅ Pagato
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">🛒 Nuovo ordine</h2>
      <form className="create-order-form" onSubmit={handleCreateOrder}>
        {newOrder.items.map((item, index) => (
          <div key={index} className="item-row">
            <input
              placeholder="Nome prodotto"
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
              min="1"
              required
            />
            <input
              type="number"
              placeholder="Prezzo"
              value={item.price}
              onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              required
            />
            {newOrder.items.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => removeItem(index)}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItem}>
          + Aggiungi item
        </button>
        <div className="form-footer">
          <span className="total">Totale: {newOrder.total} XMR</span>
          <button type="submit" className="create-btn" disabled={creating}>
            {creating ? 'Creazione...' : 'Crea Ordine'}
          </button>
        </div>
      </form>

      {/* Payment Modal */}
      {showPaymentModal && <PaymentModal />}
    </div>
  );
};

export default Dashboard;