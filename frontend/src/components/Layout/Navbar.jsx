import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center flex-wrap">
        <Link to="/" className="text-xl font-bold">MyZubster</Link>
        <div className="flex flex-wrap items-center space-x-4">
          <Link to="/offers" className="hover:text-gray-300">Offerte</Link>
          <Link to="/skills" className="hover:text-gray-300">Competenze</Link>
          <Link to="/tokens" className="hover:text-gray-300">💎 Token</Link>
          {user ? (
            <>
              <Link to="/offers/create" className="hover:text-gray-300">+ Nuova Offerta</Link>
              <Link to="/requests" className="hover:text-gray-300">Richieste</Link>
              <Link to="/dashboard" className="hover:text-gray-300">Dashboard</Link>
              <button onClick={logout} className="hover:text-gray-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-300">Login</Link>
              <Link to="/register" className="hover:text-gray-300">Registrati</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
