const i18next = require('i18next');

const resources = {
  en: { translation: require('../locales/en/translation.json') },
  zh: { translation: require('../locales/zh/translation.json') },
  ms: { translation: require('../locales/ms/translation.json') },
  ta: { translation: require('../locales/ta/translation.json') },
  it: { translation: require('../locales/it/translation.json') }
};

const supportedLanguages = Object.keys(resources);
const fallbackLanguage = 'en';

if (!i18next.isInitialized) {
  i18next.init({
    resources,
    fallbackLng: fallbackLanguage,
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false
    }
  });
}

function normalizeLanguage(languageHeader = '') {
  const requested = String(languageHeader)
    .split(',')
    .map(part => part.trim().split(';')[0].toLowerCase())
    .filter(Boolean);

  for (const language of requested) {
    const baseLanguage = language.split('-')[0];
    if (supportedLanguages.includes(language)) return language;
    if (supportedLanguages.includes(baseLanguage)) return baseLanguage;
  }

  return fallbackLanguage;
}

module.exports = {
  i18next,
  normalizeLanguage,
  supportedLanguages,
  fallbackLanguage
};
