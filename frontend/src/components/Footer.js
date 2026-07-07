// src/components/Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>🧩 MyZubster</h3>
                    <p>Skill Exchange Platform Decentralizzata</p>
                    <p className="footer-fee">💰 Fee: 2% (Decentralizzata)</p>
                </div>
                
                <div className="footer-section">
                    <h4>Link</h4>
                    <a href="https://github.com/DanielIoni-creator/MyZubsterAPP" target="_blank" rel="noopener noreferrer">
                        GitHub
                    </a>
                    <a href="/about">About</a>
                    <a href="/privacy">Privacy</a>
                </div>
                
                <div className="footer-section">
                    <h4>Community</h4>
                    <a href="/contribute">Contribuisci</a>
                    <a href="/support">Supporto</a>
                    <a href="/fee/governance">Governance</a>
                </div>
                
                <div className="footer-section">
                    <h4>Blockchain</h4>
                    <a href="/fee/config">Fee Config</a>
                    <a href="/reviews">Recensioni</a>
                </div>
            </div>
            
            <div className="footer-bottom">
                <p>© 2026 MyZubster - Made with ❤️ - v0.5.0</p>
            </div>
        </footer>
    );
};

export default Footer;