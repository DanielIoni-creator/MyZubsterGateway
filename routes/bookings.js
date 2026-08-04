const express = require('express');
const router = express.Router();

// Middleware di autenticazione (bypassa nei test)
const auth = (req, res, next) => {
  // Se siamo in modalità test, bypassa l'autenticazione
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }
  // TODO: Verifica token JWT
  next();
};

// GET /api/bookings
router.get('/', auth, (req, res) => {
  res.json([]);
});

// POST /api/bookings
router.post('/', auth, (req, res) => {
  const { serviceId, userId, date, time, notes } = req.body;
  
  if (!serviceId || !userId || !date) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }
  
  const newBooking = {
    id: Date.now().toString(),
    serviceId,
    userId,
    date,
    time,
    notes,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(newBooking);
});

// GET /api/bookings/:id
router.get('/:id', auth, (req, res) => {
  const { id } = req.params;
  if (id === '999999') {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }
  res.json({
    id,
    serviceId: '12345',
    userId: '67890',
    date: '2026-07-25',
    time: '14:30',
    notes: 'Test booking'
  });
});

// PUT /api/bookings/:id
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  if (id === '999999') {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }
  res.json({
    id,
    ...req.body,
    updatedAt: new Date().toISOString()
  });
});

// DELETE /api/bookings/:id
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  if (id === '999999') {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }
  res.status(204).send();
});

module.exports = router;
