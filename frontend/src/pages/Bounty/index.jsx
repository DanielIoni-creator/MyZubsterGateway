import React, { useState, useEffect } from 'react';
import BountyCard from '../../components/BountyCard';
import './Bounty.css';

const Bounty = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    claimed: 0,
    completed: 0
  });

  useEffect(() => {
    // Fetch bounty data from GitHub API
    const fetchBounties = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/MyZubster-Ecosystem/MyZubsterGateway/issues?labels=bounty&state=open&per_page=100'
        );
        const data = await response.json();
        setBounties(data);
        setStats({
          total: data.length,
          open: data.filter(i => i.state === 'open').length,
          claimed: data.filter(i => i.assignees && i.assignees.length > 0).length,
          completed: 0 // Will be fetched from closed issues
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching bounties:', error);
        setLoading(false);
      }
    };

    fetchBounties();
  }, []);

  const filteredBounties = activeTab === 'all' 
    ? bounties 
    : bounties.filter(b => 
        b.labels.some(l => l.name.toLowerCase().includes(activeTab))
      );

  const categories = [
    { id: 'all', label: '📋 Tutti', icon: '📋' },
    { id: 'business', label: '🏪 Negozi', icon: '🏪' },
    { id: 'robot', label: '🤖 Robot', icon: '🤖' },
    { id: 'marketing', label: '📢 Marketing', icon: '📢' },
    { id: 'translation', label: '🌍 Traduzioni', icon: '🌍' },
    { id: 'security', label: '🔒 Security', icon: '🔒' }
  ];

  if (loading) {
    return (
      <div className="bounty-loading">
        <div className="spinner"></div>
        <p>Caricamento bounty in corso...</p>
      </div>
    );
  }

  return (
    <div className="bounty-page">
      {/* HERO SECTION */}
      <section className="bounty-hero">
        <div className="bounty-hero-content">
          <h1>🚀 MyZubster Bounty Program</h1>
          <p className="subtitle">
            Guadagna <span className="highlight">MYZ</span> costruendo l'ecosistema dei robot decentralizzati
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Bounty totali</span>
            </div>
            <div className="stat">
              <span className="stat-number">{stats.open}</span>
              <span className="stat-label">Aperti</span>
            </div>
            <div className="stat">
              <span className="stat-number">{stats.claimed}</span>
              <span className="stat-label">In corso</span>
            </div>
            <div className="stat">
              <span className="stat-number">1.500+</span>
              <span className="stat-label">MYZ in palio</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY TABS */}
      <div className="bounty-tabs">
        <div className="tabs-container">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`tab ${activeTab === cat.id ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOUNTY GRID */}
      <section className="bounty-grid-section">
        <div className="bounty-grid">
          {filteredBounties.length > 0 ? (
            filteredBounties.map(bounty => (
              <BountyCard key={bounty.id} bounty={bounty} />
            ))
          ) : (
            <div className="no-bounties">
              <p>😅 Nessun bounty in questa categoria al momento</p>
              <p>Controlla le altre categorie o torna più tardi!</p>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h2>📌 Come partecipare</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Scegli un bounty</h3>
            <p>Naviga la lista e trova il bounty che fa per te</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Reclama</h3>
            <p>Commenta "I claim this bounty" sull'issue GitHub</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Sviluppa</h3>
            <p>Completa il task e apri una PR entro 7 giorni</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>💰 Guadagna</h3>
            <p>Ricevi il pagamento in MYZ automaticamente dopo il merge</p>
          </div>
        </div>
      </section>

      {/* REWARD TABLE */}
      <section className="reward-summary">
        <h2>🏆 Ricompense disponibili</h2>
        <div className="reward-grid">
          <div className="reward-item">
            <span className="reward-icon">🏪</span>
            <span className="reward-title">Porta un negozio</span>
            <span className="reward-amount">50 MYZ</span>
          </div>
          <div className="reward-item highlight">
            <span className="reward-icon">🤖</span>
            <span className="reward-title">Costruisci un robot</span>
            <span className="reward-amount">200 MYZ + 1%</span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">📢</span>
            <span className="reward-title">Content Creator</span>
            <span className="reward-amount">30 MYZ + views</span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">🌍</span>
            <span className="reward-title">Traduttore</span>
            <span className="reward-amount">100 MYZ</span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">🔒</span>
            <span className="reward-title">Bug Hunter</span>
            <span className="reward-amount">50-500 MYZ</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bounty-cta">
        <h2>Pronto a guadagnare MYZ?</h2>
        <p>Unisciti alla community di sviluppatori che stanno costruendo il futuro dei robot decentralizzati</p>
        <a 
          href="https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues?q=is%3Aissue+is%3Aopen+label%3Abounty" 
          target="_blank" 
          rel="noopener noreferrer"
          className="cta-button"
        >
          Vedi tutti i bounty su GitHub →
        </a>
      </section>
    </div>
  );
};

export default Bounty;
