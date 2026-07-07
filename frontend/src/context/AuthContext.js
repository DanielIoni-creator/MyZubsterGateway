// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Crea il contesto
const AuthContext = createContext();

// Provider del contesto
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Carica l'utente all'avvio
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    // Imposta il token nelle richieste axios
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    const response = await axios.get('/api/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Errore caricamento utente:', error);
                    localStorage.removeItem('token');
                    setToken(null);
                    delete axios.defaults.headers.common['Authorization'];
                }
            }
            setLoading(false);
        };
        loadUser();
    }, [token]);

    // ─── LOGIN ───
    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data;
            
            // Salva token
            localStorage.setItem('token', token);
            setToken(token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.error || 'Errore durante il login' 
            };
        }
    };

    // ─── REGISTRAZIONE ───
    const register = async (userData) => {
        try {
            const response = await axios.post('/api/auth/register', userData);
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.error || 'Errore durante la registrazione' 
            };
        }
    };

    // ─── LOGOUT ───
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    // ─── AGGIORNA PROFILO ───
    const updateUser = (updatedData) => {
        setUser(prev => ({ ...prev, ...updatedData }));
    };

    // ─── VERIFICA SE L'UTENTE È AUTENTICATO ───
    const isAuthenticated = !!user && !!token;

    // Valori da esportare
    const value = {
        user,
        loading,
        token,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ─── HOOK PERSONALIZZATO ───
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
    }
    return context;
};

export default AuthContext;