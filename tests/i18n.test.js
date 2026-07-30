const express = require('express');
const request = require('supertest');

const {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translate,
} = require('../config/i18n');
const i18nMiddleware = require('../middleware/i18n');

function buildTestApp() {
  const app = express();

  app.use(i18nMiddleware);

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: req.t('health.message', { service: 'MyZubster' }),
      timestamp: '2026-07-30T00:00:00.000Z',
      version: '1.0.0',
    });
  });

  app.get('/fallback-error', (req, res, next) => {
    next(new Error());
  });

  app.get('/specific-error', (req, res, next) => {
    next(new Error('Specific failure'));
  });

  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || req.t('errors.internal'),
    });
  });

  return app;
}

describe('Accept-Language negotiation', () => {
  test.each([
    [undefined, 'en'],
    ['', 'en'],
    ['zh', 'zh'],
    ['IT-it', 'it'],
    ['ms_MY', 'ms'],
    ['zh-Hant-TW,zh;q=0.8', 'zh'],
    ['ms;q=0.4, ta-IN;q=0.9', 'ta'],
    ['fr-FR;q=1, it;q=0.7', 'it'],
    ['zh;q=0, ms-MY;q=0.5', 'ms'],
    ['it;q=0, zh;q=0', 'en'],
    ['de-DE, fr;q=0.8', 'en'],
    ['ms;q=0.7, it;q=0.7', 'ms'],
    ['it;q=invalid, ta;q=0.5', 'ta'],
    ['it;q=1.1, zh;q=0.5', 'zh'],
    ['*', 'en'],
  ])('selects %s as %s', (header, expectedLanguage) => {
    expect(detectLanguage(header)).toBe(expectedLanguage);
  });
});

describe('translation catalogs', () => {
  test('loads every required locale dynamically', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'zh', 'ms', 'ta', 'it']);
    expect(DEFAULT_LANGUAGE).toBe('en');

    const expectedHealthMessages = {
      en: 'MyZubster Gateway is running!',
      zh: 'MyZubster Gateway 正在运行！',
      ms: 'Gateway MyZubster sedang berjalan!',
      ta: 'MyZubster Gateway இயங்குகிறது!',
      it: 'MyZubster Gateway è operativo!',
    };

    for (const language of SUPPORTED_LANGUAGES) {
      expect(
        translate(language, 'health.message', { service: 'MyZubster' })
      ).toBe(expectedHealthMessages[language]);
      expect(translate(language, 'errors.internal')).not.toBe(
        'errors.internal'
      );
    }
  });

  test('falls back to English and returns unknown keys deterministically', () => {
    expect(translate('fr-FR', 'errors.internal')).toBe(
      'Internal server error'
    );
    expect(translate('it', 'missing.key')).toBe('missing.key');
  });
});

describe('i18n middleware', () => {
  const app = buildTestApp();

  test('localizes health without changing its JSON shape or status', async () => {
    const response = await request(app)
      .get('/health')
      .set('Accept-Language', 'it-IT,it;q=0.8')
      .expect(200);

    expect(response.body).toEqual({
      status: 'OK',
      message: 'MyZubster Gateway è operativo!',
      timestamp: '2026-07-30T00:00:00.000Z',
      version: '1.0.0',
    });
    expect(response.headers['content-language']).toBe('it');
    expect(response.headers.vary.split(',').map((value) => value.trim())).toContain(
      'Accept-Language'
    );
  });

  test('uses English when the header is missing', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.message).toBe('MyZubster Gateway is running!');
    expect(response.headers['content-language']).toBe('en');
  });

  test('localizes only the fallback error and preserves explicit errors', async () => {
    const fallbackResponse = await request(app)
      .get('/fallback-error')
      .set('Accept-Language', 'zh-CN')
      .expect(500);
    const specificResponse = await request(app)
      .get('/specific-error')
      .set('Accept-Language', 'zh-CN')
      .expect(500);

    expect(fallbackResponse.body).toEqual({
      success: false,
      message: '服务器内部错误',
    });
    expect(specificResponse.body).toEqual({
      success: false,
      message: 'Specific failure',
    });
    expect(fallbackResponse.headers['content-language']).toBe('zh');
  });
});
