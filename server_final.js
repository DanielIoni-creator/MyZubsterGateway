const express = require('express');
const app = express();

console.log('✅ Prima della rotta');

app.get('/', (req, res) => {
    console.log('✅ Rotta / chiamata!');
    res.send('✅ Gateway funzionante!');
});

console.log('✅ Dopo la rotta');

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server in ascolto su 0.0.0.0:${PORT}`);
});
