import React from 'react';
import './Bounty.css';

const Bounty = () => {
  const bounties = [
    {
      title: "Porta un negozio",
      reward: "50 MYZ",
      desc: "Porta un nuovo negozio sulla piattaforma. Spendi almeno 100 MYZ in 30 giorni.",
      label: "business"
    },
    {
      title: "Costruisci un robot",
      reward: "200 MYZ + 1% lifetime",
      desc: "Sviluppa un robot approvato, usato da almeno 10 clienti.",
      label: "developer"
    },
    {
      title: "Content Creator",
      reward: "30 MYZ + 10 MYZ/1000 views",
      desc: "Crea video su MyZubster con hashtag #MyZubsterRobot",
      label: "marketing"
    },
    {
      title: "Traduttore",
      reward: "100 MYZ per lingua",
      desc: "Traduci UI + 5 robot + 10 template in una nuova lingua.",
      label: "international"
    },
    {
      title: "Bug Hunter",
      reward: "50-500 MYZ",
      desc: "Trova e segnala bug nel sistema. Ricompensa in base alla gravità.",
      label: "security"
    }
  ];

  return (
    <div className="bounty-page">
      <header className="bounty-header">
        <h1>🚀 MyZubster Bounty Program</h1>
        <p>1.500+ MYZ in ricompense per far crescere l'ecosistema</p>
      </header>

      <div className="bounty-grid">
        {bounties.map((b, i) => (
          <div key={i} className={`bounty-card ${b.label}`}>
            <h3>{b.title}</h3>
            <div className="reward">{b.reward}</div>
            <p>{b.desc}</p>
            <a href="https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues" target="_blank" rel="noopener noreferrer">
              Partecipa →
            </a>
          </div>
        ))}
      </div>

      <div className="bounty-footer">
        <h2>📌 Come funziona</h2>
        <ol>
          <li>Scegli un bounty dalla lista</li>
          <li>Commenta "I claim this bounty" sull'issue GitHub</li>
          <li>Completa il task entro i termini</li>
          <li>Ricevi il pagamento in MYZ automaticamente</li>
        </ol>
        <p>💰 Tutti i pagamenti sono in MYZ (token Tari)</p>
        <p>🔗 <a href="https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues">Vedi tutti i bounty su GitHub</a></p>
      </div>
    </div>
  );
};

export default Bounty;
