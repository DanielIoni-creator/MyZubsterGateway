// src/services/reviewService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const reviewService = {
    // ─── OTTIENI RECENSIONI PER TARGET ───
    getReviewsByTarget: async (targetId) => {
        try {
            const response = await axios.get(`${API_URL}/reviews/target/${targetId}`);
            return response.data;
        } catch (error) {
            console.error('Errore nel recupero recensioni:', error);
            throw error;
        }
    },

    // ─── CREA UNA NUOVA RECENSIONE ───
    createReview: async (reviewData) => {
        try {
            const response = await axios.post(`${API_URL}/reviews`, reviewData);
            return response.data;
        } catch (error) {
            console.error('Errore nella creazione recensione:', error);
            throw error;
        }
    },

    // ─── AGGIORNA UNA RECENSIONE ───
    updateReview: async (reviewId, reviewData) => {
        try {
            const response = await axios.put(`${API_URL}/reviews/${reviewId}`, reviewData);
            return response.data;
        } catch (error) {
            console.error('Errore nell\'aggiornamento recensione:', error);
            throw error;
        }
    },

    // ─── ELIMINA UNA RECENSIONE ───
    deleteReview: async (reviewId) => {
        try {
            const response = await axios.delete(`${API_URL}/reviews/${reviewId}`);
            return response.data;
        } catch (error) {
            console.error('Errore nell\'eliminazione recensione:', error);
            throw error;
        }
    },

    // ─── OTTIENI STATISTICHE RECENSIONI ───
    getReviewStats: async (targetId) => {
        try {
            const response = await axios.get(`${API_URL}/reviews/stats/${targetId}`);
            return response.data;
        } catch (error) {
            console.error('Errore nel recupero statistiche:', error);
            throw error;
        }
    }
};

export default reviewService;