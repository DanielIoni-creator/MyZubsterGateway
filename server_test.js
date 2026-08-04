const express = require('express');
const app = express();

// Middleware di logging
app.use((req, res, next) => {
    console.log(`📨 Richiesta ricevuta: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    console.log('✅ Rotta / chiamata!');
    res.send('✅ Gateway funzionante!');
});

// Rotta di fallback per vedere cosa viene catturato
app.use((req, res) => {
    console.log(`❌ Nessuna rotta per: ${req.method} ${req.url}`);
    res.status(404).send('Route not found');
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`✅ Server in ascolto su localhost:${PORT}`);
});
