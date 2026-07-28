const fs = require('fs');
const path = require('path');

const DEFAULT_LANGUAGE = 'en';
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SUPPORTED_LANGUAGES = ['en', 'zh', 'ms', 'ta', 'it'];
const translations = new Map();

const loadTranslations = (language) => {
  const normalizedLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;

  if (!translations.has(normalizedLanguage)) {
    const filePath = path.join(LOCALES_DIR, `${normalizedLanguage}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    translations.set(normalizedLanguage, messages);
  }

  return translations.get(normalizedLanguage);
};

const parseAcceptLanguage = (header = '') => {
  return header
    .split(',')
    .map((entry) => {
      const [tag, qValue] = entry.trim().split(';q=');
      return {
        tag: tag.toLowerCase(),
        quality: qValue ? Number(qValue) : 1
      };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality);
};

const detectLanguage = (header) => {
  const preferredLanguages = parseAcceptLanguage(header);

  for (const { tag } of preferredLanguages) {
    const baseLanguage = tag.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(baseLanguage)) {
      return baseLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
};

const interpolate = (message, values = {}) => {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
};

const translate = (language, key, values) => {
  const languageMessages = loadTranslations(language);
  const fallbackMessages = language === DEFAULT_LANGUAGE ? languageMessages : loadTranslations(DEFAULT_LANGUAGE);
  const message = languageMessages[key] || fallbackMessages[key] || key;
  return interpolate(message, values);
};

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translate
};
