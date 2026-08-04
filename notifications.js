// notifications.js – Sistema di notifiche reali (BOUNTY B6)
// Integrazioni: Telegram, Email (Nodemailer), WebSocket
const axios = require('axios');

// === CONFIGURAZIONE ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'myzubster@example.com';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

// === CONNESSIONI WEBSOCKET ATTIVE ===
const wsClients = new Map(); // clientId -> ws

// === TELEGRAM ===
async function sendTelegram(chatId, message) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('📱 Telegram not configured (no TELEGRAM_BOT_TOKEN)');
    return false;
  }
  try {
    const target = chatId || TELEGRAM_CHAT_ID;
    if (!target) return false;
    
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: target,
        text: message,
        parse_mode: 'HTML'
      },
      { timeout: 10000 }
    );
    console.log(`📱 Telegram sent to ${target}`);
    return true;
  } catch (err) {
    console.error(`❌ Telegram error: ${err.message}`);
    return false;
  }
}

// === EMAIL (Nodemailer-like via SMTP) ===
async function sendEmail(to, subject, text) {
  if (!EMAIL_HOST || !EMAIL_USER) {
    console.log('📧 Email not configured');
    return false;
  }
  try {
    // Use nodemailer if available, otherwise simulate
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('📧 nodemailer not installed — logging email to console');
      console.log(`   To: ${to}\n   Subject: ${subject}\n   Body: ${text}`);
      return true;
    }
    console.error(`❌ Email error: ${err.message}`);
    return false;
  }
}

// === WEBSOCKET ===
function registerWsClient(clientId, ws) {
  wsClients.set(clientId, ws);
  console.log(`🔌 WS client registered: ${clientId}`);
}

function unregisterWsClient(clientId) {
  wsClients.delete(clientId);
  console.log(`🔌 WS client unregistered: ${clientId}`);
}

function broadcastWs(message) {
  const payload = JSON.stringify({
    type: 'notification',
    message,
    timestamp: new Date().toISOString()
  });
  
  wsClients.forEach((ws, clientId) => {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(payload);
      } else {
        wsClients.delete(clientId);
      }
    } catch (err) {
      console.error(`❌ WS send error to ${clientId}: ${err.message}`);
      wsClients.delete(clientId);
    }
  });
}

// === NOTIFICHE UNIFICATE ===
async function notifyUser(userId, message, userData = {}) {
  console.log(`📨 Notifying user ${userId}: ${message}`);
  const results = [];
  
  // Telegram
  if (userData.telegramChatId || TELEGRAM_CHAT_ID) {
    const tgResult = await sendTelegram(userData.telegramChatId, `👤 *User Notification*\n\n${message}`);
    results.push({ channel: 'telegram', success: tgResult });
  }
  
  // Email (for critical events)
  if (userData.email) {
    const emailResult = await sendEmail(userData.email, 'MyZubster Notification', message);
    results.push({ channel: 'email', success: emailResult });
  }
  
  // WebSocket (real-time dashboard)
  broadcastWs(`[User ${userId}] ${message}`);
  results.push({ channel: 'websocket', success: true });
  
  return results;
}

async function notifyRobot(robotId, message, robotData = {}) {
  console.log(`🤖 Notifying robot ${robotId}: ${message}`);
  const results = [];
  
  // Telegram
  if (robotData.telegramChatId || TELEGRAM_CHAT_ID) {
    const tgResult = await sendTelegram(robotData.telegramChatId, `🤖 *Robot Notification*\n\n${message}`);
    results.push({ channel: 'telegram', success: tgResult });
  }
  
  // Email
  if (robotData.email) {
    const emailResult = await sendEmail(robotData.email, 'MyZubster Robot Alert', message);
    results.push({ channel: 'email', success: emailResult });
  }
  
  // WebSocket
  broadcastWs(`[Robot ${robotId}] ${message}`);
  results.push({ channel: 'websocket', success: true });
  
  return results;
}

async function notifyAdmin(message) {
  console.log(`🔔 Admin notification: ${message}`);
  return await sendTelegram(TELEGRAM_CHAT_ID, `🔔 *Admin Alert*\n\n${message}`);
}

module.exports = {
  notifyUser,
  notifyRobot,
  notifyAdmin,
  sendTelegram,
  sendEmail,
  broadcastWs,
  registerWsClient,
  unregisterWsClient
};
