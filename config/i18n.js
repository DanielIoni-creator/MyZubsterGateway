const path = require('path');

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = Object.freeze(['en', 'zh', 'ms', 'ta', 'it']);
const catalogCache = new Map();

function normalizeLanguageTag(value) {
  return String(value ?? '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();
}

function matchSupportedLanguage(languageRange) {
  const normalized = normalizeLanguageTag(languageRange);

  if (!normalized) {
    return null;
  }
  if (normalized === '*') {
    return DEFAULT_LANGUAGE;
  }
  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  const [baseLanguage] = normalized.split('-');
  return SUPPORTED_LANGUAGES.includes(baseLanguage) ? baseLanguage : null;
}

function parseQuality(parameters) {
  const qualityParameter = parameters.find((parameter) =>
    /^q\s*=/i.test(parameter)
  );

  if (!qualityParameter) {
    return 1;
  }

  const rawQuality = qualityParameter
    .slice(qualityParameter.indexOf('=') + 1)
    .trim();
  const quality = Number(rawQuality);

  return Number.isFinite(quality) && quality >= 0 && quality <= 1
    ? quality
    : 0;
}

function detectLanguage(acceptLanguageHeader) {
  const candidates = String(acceptLanguageHeader ?? '')
    .split(',')
    .map((entry, index) => {
      const [languageRange, ...parameters] = entry
        .split(';')
        .map((part) => part.trim());
      const quality = parseQuality(parameters);

      if (!languageRange || quality === 0) {
        return null;
      }

      return {
        index,
        languageRange,
        quality,
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.quality - left.quality || left.index - right.index
    );

  for (const candidate of candidates) {
    const matchedLanguage = matchSupportedLanguage(candidate.languageRange);
    if (matchedLanguage) {
      return matchedLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
}

function loadCatalog(language) {
  const selectedLanguage =
    matchSupportedLanguage(language) || DEFAULT_LANGUAGE;

  if (!catalogCache.has(selectedLanguage)) {
    const catalogPath = path.join(
      __dirname,
      '..',
      'locales',
      `${selectedLanguage}.json`
    );
    catalogCache.set(selectedLanguage, require(catalogPath));
  }

  return catalogCache.get(selectedLanguage);
}

function lookupMessage(catalog, key) {
  return String(key ?? '')
    .split('.')
    .filter(Boolean)
    .reduce((value, segment) => {
      if (
        value &&
        typeof value === 'object' &&
        Object.prototype.hasOwnProperty.call(value, segment)
      ) {
        return value[segment];
      }
      return undefined;
    }, catalog);
}

function interpolate(message, params) {
  const values = params && typeof params === 'object' ? params : {};

  return String(message).replace(/\{\{([\w.-]+)\}\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder
  );
}

function translate(language, key, params = {}) {
  const selectedLanguage =
    matchSupportedLanguage(language) || DEFAULT_LANGUAGE;
  const localizedMessage = lookupMessage(loadCatalog(selectedLanguage), key);
  const fallbackMessage =
    selectedLanguage === DEFAULT_LANGUAGE
      ? localizedMessage
      : lookupMessage(loadCatalog(DEFAULT_LANGUAGE), key);
  let message = localizedMessage;

  if (typeof message !== 'string') {
    message = fallbackMessage;
  }
  if (typeof message !== 'string') {
    message = key;
  }

  return interpolate(message, params);
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translate,
};
