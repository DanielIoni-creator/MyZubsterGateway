const express = require('express');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translate,
} = require('../config/i18n');
const { authorizeAdmin } = require('../middleware/admin');
const authMiddleware = require('../middleware/auth');
const i18nMiddleware = require('../middleware/i18n');
const authRouter = require('../src/routes/auth');
const webhookRouter = require('../routes/webhook');
const WebhookService = require('../services/webhookService');

function flattenCatalog(value, prefix = '', result = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const flattenedKey = prefix ? `${prefix}.${key}` : key;

    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      flattenCatalog(entry, flattenedKey, result);
    } else {
      result[flattenedKey] = entry;
    }
  }

  return result;
}

function interpolationKeys(message) {
  return Array.from(
    String(message).matchAll(/\{\{([\w.-]+)\}\}/g),
    (match) => match[1]
  ).sort();
}

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

function buildRouteIntegrationApp() {
  const app = express();

  app.use(express.json());
  app.use(i18nMiddleware);
  app.use('/auth', authRouter);
  app.get('/protected', authMiddleware, (req, res) => {
    res.json({ success: true });
  });
  app.get(
    '/admin',
    (req, res, next) => {
      req.user = { role: 'member' };
      next();
    },
    authorizeAdmin,
    (req, res) => {
      res.json({ success: true });
    }
  );
  app.use('/webhook', webhookRouter);

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
  test('keeps catalog keys and interpolation placeholders in parity', () => {
    const catalogs = Object.fromEntries(
      SUPPORTED_LANGUAGES.map((language) => {
        const catalogPath = path.join(
          __dirname,
          '..',
          'locales',
          `${language}.json`
        );

        return [
          language,
          flattenCatalog(JSON.parse(fs.readFileSync(catalogPath, 'utf8'))),
        ];
      })
    );
    const englishKeys = Object.keys(catalogs.en).sort();

    for (const language of SUPPORTED_LANGUAGES) {
      const catalog = catalogs[language];

      expect(Object.keys(catalog).sort()).toEqual(englishKeys);
      for (const key of englishKeys) {
        expect(typeof catalog[key]).toBe('string');
        expect(catalog[key].trim()).not.toBe('');
        expect(interpolationKeys(catalog[key])).toEqual(
          interpolationKeys(catalogs.en[key])
        );
      }
    }
  });

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

  test('isolates language selection across concurrent requests', async () => {
    const [italianResponse, chineseResponse] = await Promise.all([
      request(app).get('/health').set('Accept-Language', 'it-IT'),
      request(app).get('/health').set('Accept-Language', 'zh-CN'),
    ]);

    expect(italianResponse.body.message).toBe(
      'MyZubster Gateway è operativo!'
    );
    expect(italianResponse.headers['content-language']).toBe('it');
    expect(chineseResponse.body.message).toBe(
      'MyZubster Gateway 正在运行！'
    );
    expect(chineseResponse.headers['content-language']).toBe('zh');
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
    expect(specificResponse.headers['content-language']).toBeUndefined();
  });
});

describe('mounted route and middleware integration', () => {
  const app = buildRouteIntegrationApp();

  test('localizes auth route messages without changing their shape', async () => {
    const [loginResponse, registerResponse] = await Promise.all([
      request(app)
        .post('/auth/login')
        .set('Accept-Language', 'zh-CN')
        .expect(200),
      request(app)
        .post('/auth/register')
        .set('Accept-Language', 'it-IT')
        .expect(200),
    ]);

    expect(loginResponse.body).toEqual({
      success: true,
      message: '登录端点',
    });
    expect(loginResponse.headers['content-language']).toBe('zh');
    expect(registerResponse.body).toEqual({
      success: true,
      message: 'Endpoint di registrazione',
    });
    expect(registerResponse.headers['content-language']).toBe('it');
  });

  test('localizes existing auth and admin middleware errors', async () => {
    const [authResponse, adminResponse] = await Promise.all([
      request(app)
        .get('/protected')
        .set('Accept-Language', 'ta-IN')
        .expect(401),
      request(app)
        .get('/admin')
        .set('Accept-Language', 'ms-MY')
        .expect(403),
    ]);

    expect(authResponse.body).toEqual({ error: 'அங்கீகாரம் தேவை' });
    expect(authResponse.headers['content-language']).toBe('ta');
    expect(adminResponse.body).toEqual({
      error: 'Keistimewaan pentadbir diperlukan',
    });
    expect(adminResponse.headers['content-language']).toBe('ms');
  });

  test('localizes webhook validation and success messages', async () => {
    const missingTargetResponse = await request(app)
      .post('/webhook/test-webhook')
      .set('Accept-Language', 'zh-CN')
      .send({})
      .expect(400);

    expect(missingTargetResponse.body).toEqual({
      error: '必须提供 targetUrl',
    });
    expect(missingTargetResponse.headers['content-language']).toBe('zh');

    const sendWebhook = jest
      .spyOn(WebhookService, 'sendWebhookAsync')
      .mockResolvedValue({ delivered: true });

    try {
      const successResponse = await request(app)
        .post('/webhook/test-webhook')
        .set('Accept-Language', 'it-IT')
        .send({ targetUrl: 'https://example.com/hook', payload: { ok: true } })
        .expect(200);

      expect(successResponse.body).toEqual({
        success: true,
        result: { delivered: true },
        message: 'Webhook inviato con nuovo tentativo automatico',
      });
      expect(successResponse.headers['content-language']).toBe('it');
    } finally {
      sendWebhook.mockRestore();
    }
  });
});
