const { i18next, normalizeLanguage, supportedLanguages } = require('../config/i18n');

describe('i18n configuration', () => {
  test('detects supported languages from Accept-Language headers', () => {
    expect(normalizeLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
    expect(normalizeLanguage('ms-MY,ms;q=0.9')).toBe('ms');
    expect(normalizeLanguage('ta-IN,ta;q=0.9')).toBe('ta');
    expect(normalizeLanguage('fr-FR,fr;q=0.9')).toBe('en');
  });

  test('loads translations for all required languages', () => {
    expect(supportedLanguages.sort()).toEqual(['en', 'it', 'ms', 'ta', 'zh']);

    for (const language of supportedLanguages) {
      expect(i18next.t('auth.invalidCredentials', { lng: language })).toBeTruthy();
      expect(i18next.t('orders.created', { lng: language })).toBeTruthy();
    }
  });
});
