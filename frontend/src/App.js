// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// Importa il contesto di autenticazione
import { AuthProvider, useAuth } from './context/AuthContext';

// Importa i componenti di routing
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Importa le pagine
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProfessionalProfile from './pages/ProfessionalProfile';
import ReviewsPage from './pages/ReviewsPage';
import FeeConfigPage from './pages/FeeConfigPage';
import FeeGovernance from './pages/FeeGovernance';
import AdminPanel from './pages/AdminPanel';

// Importa i componenti
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                        <Routes>
                            {/* ROUTE PUBBLICHE */}
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            
                            {/* ROUTE PROTETTE (richiedono login) */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/professional/:id" element={<ProfessionalProfile />} />
                                <Route path="/reviews/:targetId" element={<ReviewsPage />} />
                                <Route path="/fee/config" element={<FeeConfigPage />} />
                                <Route path="/fee/governance" element={<FeeGovernance />} />
                            </Route>
                            
                            {/* ROUTE ADMIN */}
                            <Route element={<AdminRoute />}>
                                <Route path="/admin" element={<AdminPanel />} />
                                <Route path="/admin/users" element={<AdminPanel />} />
                                <Route path="/admin/skills" element={<AdminPanel />} />
                                <Route path="/admin/reviews" element={<AdminPanel />} />
                                <Route path="/admin/reports" element={<AdminPanel />} />
                            </Route>
                            
                            {/* CATCH-ALL */}
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;