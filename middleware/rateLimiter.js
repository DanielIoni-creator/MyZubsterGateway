const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // 100 richieste per IP
  message: { error: 'Troppe richieste, riprova più tardi' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativi di login
  message: { error: 'Troppi tentativi di login, riprova più tardi' },
});

const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 10, // 10 richieste pesanti
  message: { error: 'Limite di richieste pesanti raggiunto' },
});

module.exports = { limiter, loginLimiter, heavyLimiter };
