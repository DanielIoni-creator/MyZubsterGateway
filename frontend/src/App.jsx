import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Bounty from './pages/Bounty';
import ApiDocs from './pages/ApiDocs';
import ErrorPage from './pages/ErrorPage';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bounty" element={<Bounty />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/404" element={<ErrorPage type="404" />} />
            <Route path="/500" element={<ErrorPage type="500" />} />
            <Route path="/403" element={<ErrorPage type="403" />} />
            <Route path="/rate-limit" element={<ErrorPage type="rate" />} />
            <Route path="/maintenance" element={<ErrorPage type="maintenance" />} />
            <Route path="/offline" element={<ErrorPage type="offline" />} />
            <Route path="*" element={<ErrorPage type="404" />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
