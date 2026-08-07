import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Bounty from './pages/Bounty';
import Home from './pages/Home';
import UrbanGardenDashboard from './pages/UrbanGardenDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import TransactionHistory from './pages/TransactionHistory';
import Allarmi from './pages/Allarmi';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bounty" element={<Bounty />} />
        <Route path="/garden" element={<UrbanGardenDashboard />} />
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/allarmi" element={<Allarmi />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;