import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_custom.jpg?t=2026" 
                alt="MyZubster Logo" 
                className="h-10 w-auto rounded-full border-2 border-blue-400"
              />
              <span className="text-xl font-bold tracking-tight">
                MyZubster
              </span>
            </div>
            <div className="hidden md:flex space-x-6">
              <Link to="/dashboard" className="hover:text-blue-400 transition">Dashboard</Link>
              <Link to="/marketplace" className="hover:text-blue-400 transition">Marketplace</Link>
              <Link to="/tokens" className="hover:text-blue-400 transition">Tokens</Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">👤 {user?.username || 'Utente'}</span>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium transition">Logout</button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <footer className="bg-gray-800 text-gray-400 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">&copy; {new Date().getFullYear()} MyZubster – Decentralized Marketplace. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Layout;
