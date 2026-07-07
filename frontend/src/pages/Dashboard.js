// src/pages/Dashboard.js
import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="page-container">
            <h1>📊 Dashboard</h1>
            <p>Benvenuto, {user?.name || 'Utente'}!</p>
            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>💼 Le tue prenotazioni</h3>
                    <p>0 prenotazioni attive</p>
                </div>
                <div className="dashboard-card">
                    <h3>⭐ Le tue recensioni</h3>
                    <p>0 recensioni ricevute</p>
                </div>
                <div className="dashboard-card">
                    <h3>💰 Fee accumulate</h3>
                    <p>0.00 XMR</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;