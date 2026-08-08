import React, { useState } from 'react';
import PaymentButton from './PaymentButton';

const ListingCard = ({ listing }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="listing-card">
      <img src={listing.image} alt={listing.name} className="listing-image" />
      
      <div className="listing-content">
        <div className="listing-header">
          <h3>{listing.name}</h3>
          <span className={`status-badge ${listing.status}`}>
            {listing.status === 'available' ? '✅ Available' : '🔴 Rented'}
          </span>
        </div>
        
        <p className="listing-description">{listing.description}</p>
        
        <div className="listing-details">
          <div className="detail-item">
            <span className="label">📍 Location</span>
            <span className="value">{listing.location}</span>
          </div>
          <div className="detail-item">
            <span className="label">💰 Price</span>
            <span className="value">{listing.price.toFixed(3)} XMR/day</span>
          </div>
          <div className="detail-item">
            <span className="label">📅 Available since</span>
            <span className="value">{new Date(listing.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="listing-features">
          {listing.features.map((feature, index) => (
            <span key={index} className="feature-tag">
              ✅ {feature}
            </span>
          ))}
        </div>

        <PaymentButton 
          gardenId={listing.id}
          duration={7}
          onSuccess={(data) => {
            console.log('Payment created:', data);
          }}
        />
      </div>
    </div>
  );
};

export default ListingCard;
