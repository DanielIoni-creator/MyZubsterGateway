// src/App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Route pubblica per login */}
          <Route path="/login" element={<Login onLogin={handleLogin} />} />

          {/* Route protetta per la dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* Route protetta per admin (SOLO admin) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirect root */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Footer con disclaimer */}
        <footer style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '12px',
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          marginTop: '40px'
        }}>
          <p>
            © 2026 MyZubster.
            <a href="/disclaimer" style={{ color: '#4f46e5', textDecoration: 'none', marginLeft: '8px' }}>
              Disclaimer of Liability
            </a>
          </p>
          <p style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
            MyZubster assumes no liability for misuse of the platform.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;