const { detectLanguage, translate } = require('../config/i18n');

function i18nMiddleware(req, res, next) {
  const language = detectLanguage(req.get('Accept-Language'));

  req.language = language;
  req.t = (key, params = {}) => translate(language, key, params);

  res.set('Content-Language', language);
  res.vary('Accept-Language');

  next();
}

module.exports = i18nMiddleware;
