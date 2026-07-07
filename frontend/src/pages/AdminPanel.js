// src/pages/AdminPanel.js
import React from 'react';

const AdminPanel = () => {
    return (
        <div className="page-container">
            <h1>🛠️ Admin Panel</h1>
            <div className="admin-grid">
                <div className="admin-card">
                    <h3>👥 Utenti</h3>
                    <p>Gestisci utenti della piattaforma</p>
                </div>
                <div className="admin-card">
                    <h3>📝 Recensioni</h3>
                    <p>Modera recensioni</p>
                </div>
                <div className="admin-card">
                    <h3>📊 Statistiche</h3>
                    <p>Visualizza metriche della piattaforma</p>
                </div>
                <div className="admin-card">
                    <h3>⚙️ Configurazione</h3>
                    <p>Impostazioni di sistema</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;