const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Servi i file statici del frontend
app.use(express.static('/var/www/myzubster-frontend'));

// Fallback per SPA
app.get('*', (req, res) => {
  res.sendFile('/var/www/myzubster-frontend/index.html');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Static server running on http://127.0.0.1:${PORT}`);
});
