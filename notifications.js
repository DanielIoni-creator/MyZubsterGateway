// notifications.js - Real notification integrations (Bounty B6)
const axios = require('axios');
const nodemailer = require('nodemailer');

// ---- Telegram ----
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_API = TG_TOKEN ? 'https://api.telegram.org/bot' + TG_TOKEN : null;

async function sendTelegram(chatId, text) {
  if (!TG_API || !chatId) return false;
  try {
    await axios.post(TG_API + '/sendMessage', {
      chat_id: chatId, text: text, parse_mode: 'HTML'
    }, { timeout: 10000 });
    console.log('[Notify] Telegram sent to ' + chatId);
    return true;
  } catch (err) {
    console.warn('[Notify] Telegram error:', err.message);
    return false;
  }
}

// ---- Email (Nodemailer) ----
let mailTransporter = null;

function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  mailTransporter = nodemailer.createTransport({
    host: host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
  return mailTransporter;
}

async function sendEmail(to, subject, text) {
  const transporter = getMailTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@myzubster.io',
      to: to,
      subject: subject,
      text: text,
      html: '<div style="font-family:sans-serif">' + text.replace(/\n/g, '<br>') + '</div>'
    });
    console.log('[Notify] Email sent to ' + to);
    return true;
  } catch (err) {
    console.warn('[Notify] Email error:', err.message);
    return false;
  }
}

// ---- WebSocket (in-memory, integrate with ws in server.js) ----
const wsClients = new Set();

function addWsClient(ws) {
  wsClients.add(ws);
  ws.on('close', function() { wsClients.delete(ws); });
}

function broadcastWs(event, data) {
  const msg = JSON.stringify({ event: event, data: data, timestamp: new Date().toISOString() });
  for (const ws of wsClients) {
    try { ws.send(msg); } catch (e) { wsClients.delete(ws); }
  }
}

// ---- Public API ----
async function notifyUser(userId, message, options) {
  const opts = options || {};
  console.log('[Notify] User ' + userId + ': ' + message);

  const results = { telegram: false, email: false, ws: false };

  // Try Telegram if chatId available
  if (opts.telegramChatId) {
    results.telegram = await sendTelegram(opts.telegramChatId, message);
  }

  // Try Email if address available
  if (opts.email) {
    results.email = await sendEmail(opts.email, 'MyZubster Notification', message);
  }

  // Broadcast via WebSocket
  broadcastWs('user_notification', { userId: userId, message: message });
  results.ws = true;

  return results;
}

async function notifyRobot(robotId, message, options) {
  const opts = options || {};
  console.log('[Notify] Robot ' + robotId + ': ' + message);

  const results = { telegram: false, email: false, ws: false };

  if (opts.telegramChatId) {
    results.telegram = await sendTelegram(opts.telegramChatId, 'Robot ' + robotId + ': ' + message);
  }
  if (opts.email) {
    results.email = await sendEmail(opts.email, 'MyZubster Robot Alert', 'Robot ' + robotId + ': ' + message);
  }

  broadcastWs('robot_notification', { robotId: robotId, message: message });
  results.ws = true;

  return results;
}

// Broadcast events
function notifyBountyCreated(bounty) {
  broadcastWs('bounty_created', bounty);
}

function notifyRewardPaid(reward) {
  broadcastWs('reward_paid', reward);
}

function notifyEscrowUpdate(escrow) {
  broadcastWs('escrow_update', escrow);
}

// Status
function getStatus() {
  return {
    telegram: !!TG_TOKEN,
    email: !!process.env.SMTP_HOST,
    websocket: wsClients.size,
    wsClients: wsClients.size
  };
}

module.exports = {
  notifyUser, notifyRobot,
  notifyBountyCreated, notifyRewardPaid, notifyEscrowUpdate,
  addWsClient, broadcastWs, getStatus,
  sendTelegram, sendEmail
};
