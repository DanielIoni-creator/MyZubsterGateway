// src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
    return (
        <div className="home-container">
            <section className="hero">
                <h1>🧩 MyZubster</h1>
                <p className="subtitle">Skill Exchange Platform Decentralizzata</p>
                <p className="description">
                    Connetti persone per scambiare competenze e servizi — 
                    da idraulica e parrucchiere a tutoraggio e supporto tecnico.
                </p>
                <div className="cta-buttons">
                    <Link to="/register" className="btn-primary">Inizia Ora</Link>
                    <Link to="/search" className="btn-secondary">Esplora Servizi</Link>
                </div>
            </section>

            <section className="features">
                <div className="feature-card">
                    <h3>🔒 Privacy First</h3>
                    <p>Pagamenti in Monero e identità decentralizzata</p>
                </div>
                <div className="feature-card">
                    <h3>💰 Fee 2%</h3>
                    <p>Fee decentralizzata gestita da smart contract</p>
                </div>
                <div className="feature-card">
                    <h3>🗳️ Governance</h3>
                    <p>La community decide le regole della piattaforma</p>
                </div>
                <div className="feature-card">
                    <h3>🛡️ Escrow</h3>
                    <p>Protezione dei pagamenti con escrow on-chain</p>
                </div>
            </section>
        </div>
    );
};

export default Home;