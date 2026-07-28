const express = require('express');
const request = require('supertest');
const i18nMiddleware = require('../middleware/i18n');
const { detectLanguage, translate } = require('../utils/i18n');
const { validateLogin, validate } = require('../middleware/validators');

describe('i18n utilities', () => {
  test('detects supported language from Accept-Language quality values', () => {
    expect(detectLanguage('fr-FR,zh-TW;q=0.9,it;q=0.8')).toBe('zh');
    expect(detectLanguage('ms-MY, en;q=0.5')).toBe('ms');
  });

  test('falls back to English for unsupported languages', () => {
    expect(detectLanguage('fr-FR,es;q=0.7')).toBe('en');
    expect(translate('fr', 'auth.invalidCredentials')).toBe('Invalid credentials');
  });

  test('loads translations dynamically and interpolates values', () => {
    expect(translate('it', 'auth.invalidCredentials')).toBe('Credenziali non valide');
    expect(translate('zh', 'health.running')).toBe('MyZubster Gateway 正在运行！');
  });
});

describe('i18n middleware', () => {
  const app = express();
  app.use(express.json());
  app.use(i18nMiddleware);
  app.post('/login', validateLogin, validate, (req, res) => {
    res.json({ message: req.t('auth.invalidCredentials') });
  });

  test('attaches a request translator based on Accept-Language', async () => {
    const response = await request(app)
      .post('/login')
      .set('Accept-Language', 'ta-IN, en;q=0.5')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('தரவு தவறானது');
    expect(response.body.details).toEqual([
      'சரியான மின்னஞ்சலை உள்ளிடவும்',
      'கடவுச்சொல் அவசியம்'
    ]);
  });
});
