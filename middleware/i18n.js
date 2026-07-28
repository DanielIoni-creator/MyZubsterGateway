const { detectLanguage, translate } = require('../utils/i18n');

const i18nMiddleware = (req, res, next) => {
  req.language = detectLanguage(req.get('Accept-Language'));
  req.t = (key, values) => translate(req.language, key, values);
  next();
};

module.exports = i18nMiddleware;
