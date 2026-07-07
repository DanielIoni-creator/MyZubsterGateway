const admin = require('firebase-admin');

let initialized = false;

function initializeFirebase() {
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

function compactData(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

async function sendPushToTokens({ tokens, title, body, data = {} }) {
  const filteredTokens = [...new Set((Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean))];
  if (filteredTokens.length === 0) return null;
  if (!initializeFirebase()) return null;

  const message = {
    tokens: filteredTokens,
    notification: { title, body },
    data: compactData({ title, body, ...data }),
    android: {
      priority: 'high',
      notification: {
        channelId: 'myzubster_notifications',
        clickAction: 'OPEN_MYZUBSTER_NOTIFICATION'
      }
    }
  };

  if (filteredTokens.length === 1) {
    const messageId = await admin.messaging().send({ ...message, token: filteredTokens[0], tokens: undefined });
    return { successCount: 1, failureCount: 0, responses: [{ success: true, messageId }] };
  }

  return admin.messaging().sendEachForMulticast(message);
}

async function sendPaymentConfirmedNotification({ token, payment }) {
  return sendPushToTokens({
    tokens: token,
    title: 'Pagamento Monero confermato',
    body: `Pagamento ${payment.amount} XMR ricevuto su MyZubster.`,
    data: {
      type: 'payment_confirmed',
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: 'confirmed'
    }
  });
}

async function sendMessageNotification({ tokens, message }) {
  const senderName = message.senderName || 'Un utente MyZubster';
  return sendPushToTokens({
    tokens,
    title: `Nuovo messaggio da ${senderName}`,
    body: message.text || 'Hai ricevuto un nuovo messaggio.',
    data: {
      type: 'message_received',
      messageId: message.messageId,
      chatId: message.chatId,
      senderId: message.senderId,
      senderName,
      recipientId: message.recipientId
    }
  });
}

module.exports = {
  initializeFirebase,
  sendPushToTokens,
  sendPaymentConfirmedNotification,
  sendMessageNotification
};
