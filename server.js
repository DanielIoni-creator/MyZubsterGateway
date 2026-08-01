const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('MyZubster Gateway is running!');
});

// Avvia il server
app.listen(port, () => {
  console.log(`MyZubster Gateway listening on port ${port}`);
});
