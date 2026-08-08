import React, { useState } from 'react';
import axios from 'axios';

const PaymentButton = ({ gardenId, duration, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3002/api/payments/robot',
        {
          gardenId: gardenId,
          duration: duration || 7,
          wallet: '83vZt8bKc5qXyHZKwj2Qq3Yp'
        }
      );

      setPaymentData(response.data.data);
      
      if (onSuccess) {
        onSuccess(response.data.data);
      }

      // Mostra il wallet address per il pagamento
      alert(`
        💰 Pagamento in Monero (XMR)
        
        Invia ${response.data.data.amount} XMR a:
        ${response.data.data.payment.address}
        
        Payment ID: ${response.data.data.payment.paymentId}
        
        Il pagamento sarà verificato automaticamente.
      `);
    } catch (error) {
      alert('❌ Errore: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="rent-button" 
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? '⏳ Processing...' : '💰 Rent with XMR'}
    </button>
  );
};

export default PaymentButton;
