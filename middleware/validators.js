// middleware/validators.js
const { body, validationResult } = require('express-validator');

// Validatore per registrazione
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('validation.email')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('validation.passwordLength')
    .matches(/\d/)
    .withMessage('validation.passwordNumber')
    .matches(/[A-Z]/)
    .withMessage('validation.passwordUppercase'),
  body('name')
    .notEmpty()
    .withMessage('validation.nameRequired')
    .trim()
    .isLength({ max: 50 })
    .withMessage('validation.nameMaxLength')
];

// Validatore per login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('validation.email')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('validation.passwordRequired')
];

// Validatore per ordine
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('validation.itemsRequired'),
  body('items.*.name')
    .notEmpty()
    .withMessage('validation.itemNameRequired')
    .trim(),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('validation.quantityMin'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('validation.pricePositive'),
  body('total')
    .isFloat({ min: 0 })
    .withMessage('validation.totalPositive'),
  body('currency')
    .optional()
    .isIn(['XMR', 'EUR', 'USD'])
    .withMessage('validation.currencyUnsupported')
];

// Middleware per gestire gli errori di validazione
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: req.t('validation.invalidData'),
      details: errors.array().map(e => req.t(e.msg))
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
