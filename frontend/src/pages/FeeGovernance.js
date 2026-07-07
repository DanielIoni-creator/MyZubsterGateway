// src/pages/FeeGovernance.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const FeeGovernance = () => {
    const { user } = useAuth();
    const [proposal, setProposal] = useState({
        description: '',
        newBaseFee: '',
        newVariableRate: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Proposta creata! (Funzionalità in sviluppo)');
    };

    return (
        <div className="page-container">
            <h1>🗳️ Governance Fee</h1>
            {user ? (
                <div>
                    <p>Benvenuto, {user.name}! Puoi creare proposte per modificare le fee.</p>
                    <form onSubmit={handleSubmit} className="governance-form">
                        <div className="form-group">
                            <label>Descrizione</label>
                            <textarea
                                value={proposal.description}
                                onChange={(e) => setProposal({...proposal, description: e.target.value})}
                                placeholder="Descrivi la tua proposta..."
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Nuova Base Fee (cents)</label>
                            <input
                                type="number"
                                value={proposal.newBaseFee}
                                onChange={(e) => setProposal({...proposal, newBaseFee: e.target.value})}
                                placeholder="Es: 150 = $1.50"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Nuovo Variable Rate (basis points)</label>
                            <input
                                type="number"
                                value={proposal.newVariableRate}
                                onChange={(e) => setProposal({...proposal, newVariableRate: e.target.value})}
                                placeholder="Es: 300 = 3%"
                                required
                            />
                        </div>
                        <button type="submit">Crea Proposta</button>
                    </form>
                </div>
            ) : (
                <p>🔐 Effettua il login per partecipare alla governance.</p>
            )}
        </div>
    );
};

export default FeeGovernance;