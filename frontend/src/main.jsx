import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import './index.css';

// Apply saved theme before render to prevent flash
(function() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ThemeToggle />
  </React.StrictMode>,
);
