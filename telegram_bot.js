// telegram_bot.js – Bot Telegram per monitoraggio robot (BOUNTY B10)
const axios = require('axios');
const { notifyUser, notifyRobot: notifyR } = require('./notifications');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API = 'https://api.telegram.org/bot' + TOKEN;

// In-memory user registration (replace with DB in production)
const users = new Map(); // chatId -> { registered: bool, robotId: string }
const robots = new Map(); // robotId -> { name: string, owner: string, status: string }

async function sendMessage(chatId, text) {
  if (!TOKEN) return;
  try {
    await axios.post(API + '/sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }, { timeout: 10000 });
  } catch (err) {
    console.error('TG Bot send error:', err.message);
  }
}

async function handleUpdate(update) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const username = msg.from.username || msg.from.first_name || 'User';

  if (text === '/start') {
    await sendMessage(chatId, '🤖 <b>MyZubster Robot Monitor</b>

' +
      'Comandi disponibili:
' +
      '/register <robotId> - Registra un robot
' +
      '/status <robotId> - Stato di un robot
' +
      '/jobs - Lavori recenti
' +
      '/help - Mostra questo messaggio');
    return;
  }

  if (text === '/help') {
    await sendMessage(chatId, '🤖 <b>MyZubster Bot Help</b>

' +
      '/register <robotId> <name> - Registra un robot
' +
      '/status <robotId> - Controlla stato robot
' +
      '/jobs - Lista lavori recenti
' +
      '/help - Questo messaggio');
    return;
  }

  if (text.startsWith('/register')) {
    const parts = text.split(' ').slice(1);
    if (parts.length < 2) {
      await sendMessage(chatId, '❌ Uso: /register <robotId> <name>');
      return;
    }
    const [robotId, name] = parts;
    robots.set(robotId, {
      name,
      owner: username,
      status: 'idle',
      registeredAt: new Date().toISOString()
    });
    users.set(chatId.toString(), { registered: true, robotId });
    await sendMessage(chatId, '✅ Robot <b>' + name + '</b> (' + robotId + ') registrato!
Riceverai notifiche quando completa lavori.');
    return;
  }

  if (text.startsWith('/status')) {
    const robotId = text.split(' ')[1];
    if (!robotId) {
      await sendMessage(chatId, '❌ Uso: /status <robotId>');
      return;
    }
    const robot = robots.get(robotId);
    if (!robot) {
      await sendMessage(chatId, '❌ Robot "' + robotId + '" non trovato. Usa /register prima.');
      return;
    }
    await sendMessage(chatId, '🤖 <b>' + robot.name + '</b> (' + robotId + ')
' +
      'Stato: <code>' + robot.status + '</code>
' +
      'Owner: ' + robot.owner + '
' +
      'Registrato: ' + robot.registeredAt);
    return;
  }

  if (text === '/jobs') {
    // Simulated job list (would integrate with robot_brain in production)
    const jobCount = Math.floor(Math.random() * 5);
    if (jobCount === 0) {
      await sendMessage(chatId, '📋 Nessun lavoro recente.');
    } else {
      await sendMessage(chatId, '📋 <b>Lavori recenti (' + jobCount + ')</b>
' +
        Array.from({length: jobCount}, (_, i) => '- Job #' + (1000 + i) + ': completato').join('
'));
    }
    return;
  }

  await sendMessage(chatId, '❓ Comando non riconosciuto. Usa /help per i comandi disponibili.');
}

// Notification callback - sends to registered robot owners
async function notifyRobotJobComplete(robotId, jobResult) {
  for (const [chatId, user] of users) {
    if (user.robotId === robotId) {
      await sendMessage(chatId, '🎉 <b>Job completato!</b>
' +
        'Robot: ' + robotId + '
' +
        'Risultato: ' + (jobResult || 'Success') + '
' +
        'Tempo: ' + new Date().toISOString());
    }
  }
}

// Start polling for updates (if run standalone)
function startPolling(offset = 0) {
  if (!TOKEN) {
    console.log('TG Bot: no token set, skipping polling');
    return;
  }
  axios.get(API + '/getUpdates', {
    params: { offset, timeout: 30 },
    timeout: 35
  }).then(response => {
    const updates = response.data.result || [];
    for (const update of updates) {
      handleUpdate(update);
      if (update.update_id >= offset) {
        offset = update.update_id + 1;
      }
    }
    setTimeout(() => startPolling(offset), 1000);
  }).catch(err => {
    console.error('TG Bot polling error:', err.message);
    setTimeout(() => startPolling(offset), 5000);
  });
}

// If run directly
if (require.main === module) {
  console.log('🤖 MyZubster Telegram Bot starting...');
  startPolling();
}

module.exports = { handleUpdate, notifyRobotJobComplete, sendMessage, startPolling };
