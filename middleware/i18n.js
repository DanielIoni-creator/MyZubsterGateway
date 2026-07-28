const { i18next, normalizeLanguage } = require('../config/i18n');

function i18nMiddleware(req, res, next) {
  const requestedLanguage = req.query?.lang || req.headers['accept-language'];
  req.language = normalizeLanguage(requestedLanguage);
  req.t = (key, options = {}) => i18next.t(key, { lng: req.language, ...options });
  res.locals.language = req.language;
  next();
}

module.exports = i18nMiddleware;
