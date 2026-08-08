import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Bounty from './pages/Bounty';
import ApiDocs from './pages/ApiDocs';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bounty" element={<Bounty />} />
        <Route path="/api-docs" element={<ApiDocs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
