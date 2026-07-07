// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    🧩 MyZubster
                </Link>
                
                <ul className="nav-menu">
                    <li className="nav-item">
                        <Link to="/" className="nav-link">Home</Link>
                    </li>
                    
                    {isAuthenticated ? (
                        <>
                            <li className="nav-item">
                                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/fee/config" className="nav-link">⚙️ Fee</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/fee/governance" className="nav-link">🗳️ Governance</Link>
                            </li>
                            {user?.role === 'admin' && (
                                <li className="nav-item">
                                    <Link to="/admin" className="nav-link">🛠️ Admin</Link>
                                </li>
                            )}
                            <li className="nav-item dropdown">
                                <span className="nav-link user-name">
                                    👤 {user?.name || 'Utente'}
                                </span>
                                <div className="dropdown-content">
                                    <Link to="/profile">Profilo</Link>
                                    <Link to="/settings">Impostazioni</Link>
                                    <button onClick={handleLogout} className="logout-btn">
                                        Logout
                                    </button>
                                </div>
                            </li>
                        </>
                    ) : (
                        <>
                            <li className="nav-item">
                                <Link to="/login" className="nav-link">Login</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/register" className="nav-link register-btn">Registrati</Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;