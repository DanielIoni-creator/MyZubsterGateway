import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const OfferDetail = () => {
  const { id } = useParams();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula il caricamento dei dati
    setTimeout(() => {
      setOffer({
        id: id,
        title: 'Sample Offer #' + id,
        description: 'This is a sample offer description.',
        price: 0.05,
        category: 'plants',
        created: new Date().toISOString(),
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>📦 {offer.title}</h1>
      <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '10px' }}>
        <p><strong>Description:</strong> {offer.description}</p>
        <p><strong>Price:</strong> {offer.price} XMR</p>
        <p><strong>Category:</strong> {offer.category}</p>
        <p><strong>Created:</strong> {new Date(offer.created).toLocaleString()}</p>
        <button
          style={{
            background: '#4ade80',
            color: '#0f0e17',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          💰 Buy Now
        </button>
      </div>
    </div>
  );
};

export default OfferDetail;
