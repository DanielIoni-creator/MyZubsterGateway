import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Offers from './pages/Offers';
import CreateOffer from './pages/CreateOffer';
import OfferDetail from './pages/OfferDetail';
import Requests from './pages/Requests';
import Profile from './pages/Profile';
import Tokens from './pages/Tokens';
import CreateToken from "./pages/CreateToken";
import ReputationNFTs from './pages/ReputationNFTs';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/offers/create" element={<ProtectedRoute><CreateOffer /></ProtectedRoute>} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/tokens" element={<Tokens />} />
<Route path="/tokens/create" element={<ProtectedRoute><CreateToken /></ProtectedRoute>} />
          <Route path="/reputation" element={<ProtectedRoute><ReputationNFTs /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
