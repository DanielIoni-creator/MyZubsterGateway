import React from 'react';
import './BountyCard.css';

const BountyCard = ({ bounty }) => {
  const getPriorityColor = (labels) => {
    if (labels.some(l => l.name.includes('high'))) return 'priority-high';
    if (labels.some(l => l.name.includes('medium'))) return 'priority-medium';
    return 'priority-low';
  };

  const getReward = (title, body) => {
    const match = body?.match(/\*\*(\d+)\s*\$MYZ\*\*/) || 
                  body?.match(/(\d+)\s*MYZ/);
    return match ? `${match[1]} MYZ` : 'Vedi bounty';
  };

  const isAssigned = bounty.assignees && bounty.assignees.length > 0;

  return (
    <div className={`bounty-card ${getPriorityColor(bounty.labels)}`}>
      <div className="bounty-header">
        <span className="bounty-id">#{bounty.number}</span>
        <span className={`bounty-status ${isAssigned ? 'assigned' : 'open'}`}>
          {isAssigned ? '👤 In corso' : '🟢 Aperto'}
        </span>
      </div>
      
      <h3 className="bounty-title">
        <a href={bounty.html_url} target="_blank" rel="noopener noreferrer">
          {bounty.title}
        </a>
      </h3>
      
      <p className="bounty-description">
        {bounty.body?.split('\n').slice(0, 3).join(' ') || 'Nessuna descrizione disponibile'}
      </p>
      
      <div className="bounty-meta">
        <div className="bounty-reward">
          <span className="reward-icon">💰</span>
          <span className="reward-amount">{getReward(bounty.title, bounty.body)}</span>
        </div>
        <div className="bounty-labels">
          {bounty.labels.slice(0, 3).map(label => (
            <span key={label.id} className="label" style={{ backgroundColor: `#${label.color}` }}>
              {label.name}
            </span>
          ))}
          {bounty.labels.length > 3 && (
            <span className="label more">+{bounty.labels.length - 3}</span>
          )}
        </div>
      </div>
      
      <div className="bounty-footer">
        <span className="bounty-created">
          📅 {new Date(bounty.created_at).toLocaleDateString('it-IT')}
        </span>
        <a 
          href={bounty.html_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="claim-button"
        >
          {isAssigned ? '👀 Vedi' : '🎯 Reclama'}
        </a>
      </div>
    </div>
  );
};

export default BountyCard;
