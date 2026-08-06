import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import TwoFactorSetup from './pages/TwoFactorSetup';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Offers from './pages/Offers';
import CreateOffer from './pages/CreateOffer';
import OfferDetail from './pages/OfferDetail';
import Requests from './pages/Requests';
import Profile from './pages/Profile';
import Tokens from './pages/Tokens';
import AdminDashboard from './pages/AdminDashboard';
import RobotDashboard from './pages/RobotDashboard';
import ApiDocs from './pages/ApiDocs';
import ErrorPage from './pages/ErrorPage';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/2fa-setup" element={<TwoFactorSetup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/robots" element={<ProtectedRoute><RobotDashboard /></ProtectedRoute>} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/offers/create" element={<ProtectedRoute><CreateOffer /></ProtectedRoute>} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/404" element={<ErrorPage type="404" />} />
          <Route path="/500" element={<ErrorPage type="500" />} />
          <Route path="/403" element={<ErrorPage type="403" />} />
          <Route path="/rate-limit" element={<ErrorPage type="rate" />} />
          <Route path="/maintenance" element={<ErrorPage type="maintenance" />} />
          <Route path="/offline" element={<ErrorPage type="offline" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
