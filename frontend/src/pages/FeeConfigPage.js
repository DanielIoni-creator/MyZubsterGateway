// src/pages/FeeConfigPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeeConfigPage = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await axios.get('/api/fee/config');
                setConfig(response.data.data);
            } catch (err) {
                setError('Errore nel caricamento della configurazione');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    if (loading) return <div className="loading">⏳ Caricamento...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page-container">
            <h1>⚙️ Configurazione Fee Decentralizzata</h1>
            {config && (
                <div className="fee-config">
                    <div className="fee-item">
                        <label>Base Fee</label>
                        <span>{config.baseFeeFormatted || config.baseFee/100}$</span>
                    </div>
                    <div className="fee-item">
                        <label>Variable Rate</label>
                        <span>{config.variableRateFormatted || config.variableRate/100}%</span>
                    </div>
                    <div className="fee-item">
                        <label>Discount Threshold</label>
                        <span>{config.discountThresholdFormatted || config.discountThreshold/100}$</span>
                    </div>
                    <div className="fee-item">
                        <label>Discount Rate</label>
                        <span>{config.discountRateFormatted || config.discountRate/100}%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeeConfigPage;