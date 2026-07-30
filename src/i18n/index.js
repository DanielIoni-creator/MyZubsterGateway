const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'ms', 'ta', 'it'],
    backend: { loadPath: __dirname + '/locales/{{lng}}/translation.json' },
    detection: { order: ['header'], lookupHeader: 'accept-language' },
  });

module.exports = i18next;
