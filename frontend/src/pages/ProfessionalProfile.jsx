// src/pages/ProfessionalProfile.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Reviews from '../components/Reviews/Reviews';
import './ProfessionalProfile.css';

const ProfessionalProfile = () => {
    const { id } = useParams();
    const [professional, setProfessional] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Ottieni l'ID utente corrente (da context o localStorage)
    const currentUserId = localStorage.getItem('userId') || null;

    // ─── CARICA PROFILO ───
    useEffect(() => {
        const fetchProfessional = async () => {
            try {
                setLoading(true);
                // Simula chiamata API
                // const response = await axios.get(`/api/users/${id}`);
                // setProfessional(response.data);
                
                // Dati di esempio
                setProfessional({
                    id: id,
                    name: 'Mario Rossi',
                    profession: 'Idraulico',
                    location: 'Milano',
                    description: 'Esperto idraulico con 10 anni di esperienza'
                });
            } catch (err) {
                setError('Errore nel caricamento del profilo');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProfessional();
        }
    }, [id]);

    if (loading) {
        return <div className="loading">⏳ Caricamento profilo...</div>;
    }

    if (error) {
        return <div className="error">❌ {error}</div>;
    }

    if (!professional) {
        return <div className="not-found">👤 Profilo non trovato</div>;
    }

    return (
        <div className="professional-profile">
            <div className="profile-header">
                <div className="profile-avatar">
                    <div className="avatar-placeholder">
                        {professional.name?.charAt(0) || '?'}
                    </div>
                </div>
                <div className="profile-info">
                    <h1>{professional.name}</h1>
                    <p className="profession">🔧 {professional.profession}</p>
                    <p className="location">📍 {professional.location}</p>
                    <p className="description">{professional.description}</p>
                </div>
            </div>

            {/* SEZIONE RECENSIONI */}
            <div className="profile-reviews">
                <Reviews 
                    targetId={id}
                    targetType="professional"
                    currentUserId={currentUserId}
                />
            </div>
        </div>
    );
};

export default ProfessionalProfile;