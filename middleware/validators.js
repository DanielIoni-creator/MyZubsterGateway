// middleware/validators.js
const { body, validationResult } = require('express-validator');

// Validatore per registrazione
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Inserisci un email valida')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La password deve essere almeno 8 caratteri')
    .matches(/\d/)
    .withMessage('La password deve contenere almeno un numero')
    .matches(/[A-Z]/)
    .withMessage('La password deve contenere almeno una lettera maiuscola'),
  body('name')
    .notEmpty()
    .withMessage('Il nome è obbligatorio')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Il nome non può superare i 50 caratteri')
];

// Validatore per login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Inserisci un email valida')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('La password è obbligatoria')
];

// Validatore per ordine
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Deve esserci almeno un item'),
  body('items.*.name')
    .notEmpty()
    .withMessage('Il nome del prodotto è obbligatorio')
    .trim(),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La quantità deve essere almeno 1'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Il prezzo deve essere positivo'),
  body('total')
    .isFloat({ min: 0 })
    .withMessage('Il totale deve essere positivo'),
  body('currency')
    .optional()
    .isIn(['XMR', 'EUR', 'USD'])
    .withMessage('Valuta non supportata')
];

// Middleware per gestire gli errori di validazione
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dati non validi',
      details: errors.array().map(e => e.msg)
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateOrder,
  validate
};