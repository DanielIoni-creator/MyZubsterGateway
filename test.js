const express = require('express');
const app = express();

app.get('/api/test', (req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('✅ Test server running on http://localhost:3000');
});
