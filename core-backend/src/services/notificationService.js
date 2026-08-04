const admin = require('firebase-admin');

let initialized = false;

function initializeFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  try {
    if (serviceAccountJson) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson))
      });
    } else if (serviceAccountPath) {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('Firebase Admin non configurato: notifiche push disabilitate');
      return false;
    }

    initialized = true;
    return true;
  } catch (error) {
    console.warn(`Firebase Admin init fallita: ${error.message}`);
    return false;
  }
}

function stringifyData(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

async function sendPushNotification(token, title, body, data = {}) {
  if (!token) return null;
  if (!initializeFirebaseAdmin()) return null;

  return admin.messaging().send({
    token,
    notification: { title, body },
    data: stringifyData({ title, body, ...data }),
    android: {
      priority: 'high',
      notification: {
        channelId: 'myzubster_notifications'
      }
    }
  });
}

async function sendPushNotifications(tokens, title, body, data = {}) {
  const uniqueTokens = [...new Set((Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean))];
  const results = [];

  for (const token of uniqueTokens) {
    try {
      const messageId = await sendPushNotification(token, title, body, data);
      results.push({ token, ok: Boolean(messageId), messageId });
    } catch (error) {
      results.push({ token, ok: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  initializeFirebaseAdmin,
  sendPushNotification,
  sendPushNotifications
};
