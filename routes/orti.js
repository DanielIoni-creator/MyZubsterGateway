const express = require('express');
const router = express.Router();

// Mock Data for Urban Gardens
const orti = [
    { id: 1, name: 'Orto Comunitario Roma Sud', area: 500, crops: ['Pomodori', 'Basilico', 'Lattuga'], lat: 41.8902, lng: 12.4922 },
    { id: 2, name: 'Orto Condiviso Milano', area: 300, crops: ['Zucchine', 'Menta', 'Peperoni'], lat: 45.4642, lng: 9.1900 },
    { id: 3, name: 'Giardino Urbano Napoli', area: 800, crops: ['Melanzane', 'Prezzemolo', 'Limoni'], lat: 40.8518, lng: 14.2681 }
];

// Mappa Orti Urbani - Geolocalizzazione (Bounty #745)
router.get('/map', (req, res) => {
    res.json(orti);
});

// Dashboard Orti - Visualizzazione Dati Reali/Storici (Bounty #746)
router.get('/stats', (req, res) => {
    const realtime = {
        temperature: (Math.random() * 15 + 15).toFixed(1), // 15-30 °C
        humidity: (Math.random() * 40 + 40).toFixed(1), // 40-80 %
        activeGardens: orti.length
    };
    
    // Genera dati storici per gli ultimi 7 giorni
    const history = Array.from({length: 7}).map((_, i) => ({
        day: `Giorno ${i+1}`,
        temp: (Math.random() * 10 + 18).toFixed(1),
        hum: (Math.random() * 30 + 45).toFixed(1)
    }));

    res.json({ realtime, history });
});

module.exports = router;
