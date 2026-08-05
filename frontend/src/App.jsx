import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Bounty from './pages/Bounty';
import Home from './pages/Home';
import ShopOnboarding from './pages/ShopOnboarding';
import ShopDashboard from './pages/ShopDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bounty" element={<Bounty />} />
        <Route path="/shop/onboarding" element={<ShopOnboarding />} />
        <Route path="/shop" element={<ShopDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
