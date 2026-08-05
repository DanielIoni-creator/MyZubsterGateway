import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Bounty from './pages/Bounty';
import Home from './pages/Home';
import MerchantOnboarding from './pages/MerchantOnboarding';
import MerchantDashboard from './pages/MerchantDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bounty" element={<Bounty />} />
        <Route path="/merchant/onboarding" element={<MerchantOnboarding />} />
        <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
