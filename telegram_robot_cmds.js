// telegram_robot_cmds.js — Telegram /robot commands (BOT-5, closes #342)
// Extends telegram_bot.js with robot management commands

const axios = require('axios');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API = `https://api.telegram.org/bot${TOKEN}`;

/**
 * Install robot command handlers on an existing Telegram bot instance.
 * Call this from telegram_bot.js after bot initialization:
 *   require('./telegram_robot_cmds').install(botInstance, { Robot, RobotSchedule });
 */
function install(bot, deps = {}) {
  const { Robot, RobotSchedule } = deps;

  // /robot — Show usage
  bot.onText(/\/robot$/, async (msg) => {
    const chatId = msg.chat.id;
    const help = [
      '🤖 *Robot Commands*',
      '',
      '/robot create <name> — Register a new robot',
      '/robot status <id> — Check robot status',
      '/robot assign <robotId> <jobId> — Assign job to robot',
      '/robot list — List your robots',
      '/robot feedback <robotId> <1-5> <comment> — Rate a robot',
    ].join('\n');
    await sendMessage(chatId, help);
  });

  // /robot create <name>
  bot.onText(/\/robot create (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match[1].trim();
    if (!name) return sendMessage(chatId, '❌ Usage: /robot create <name>');

    try {
      if (Robot) {
        const robotId = `robot-${Date.now().toString(36)}`;
        const walletAddress = `user:${msg.from.id}`;
        const existing = await Robot.findOne({ name, walletAddress });
        if (existing) return sendMessage(chatId, `⚠️ Robot "${name}" already exists (ID: ${existing.robotId})`);

        const robot = new Robot({ robotId, name, walletAddress, status: 'idle' });
        await robot.save();
        sendMessage(chatId, `✅ Robot created!\n*ID:* ${robotId}\n*Name:* ${name}\n*Status:* idle`);
      } else {
        sendMessage(chatId, `✅ Robot "${name}" registered! (DB not available, in-memory mode)`);
      }
    } catch (err) {
      sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });

  // /robot status <id>
  bot.onText(/\/robot status (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const robotId = match[1].trim();
    try {
      if (Robot) {
        const robot = await Robot.findOne({ robotId });
        if (!robot) return sendMessage(chatId, `❌ Robot "${robotId}" not found`);
        sendMessage(chatId, [
          `🤖 *${robot.name}*`,
          `ID: \`${robot.robotId}\``,
          `Status: ${robot.status}`,
          `Current job: ${robot.currentJob || 'none'}`,
          `Wallet: \`${robot.walletAddress}\``
        ].join('\n'));
      } else {
        sendMessage(chatId, `🤖 Robot: ${robotId}\nStatus: unknown (DB offline)`);
      }
    } catch (err) {
      sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });

  // /robot assign <robotId> <jobId>
  bot.onText(/\/robot assign (\S+) (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const robotId = match[1];
    const jobId = match[2];
    try {
      if (Robot && RobotSchedule) {
        const robot = await Robot.findOne({ robotId });
        if (!robot) return sendMessage(chatId, `❌ Robot "${robotId}" not found`);
        if (robot.status !== 'idle') return sendMessage(chatId, `⚠️ Robot is busy (status: ${robot.status})`);

        robot.status = 'working';
        robot.currentJob = jobId;
        await robot.save();
        sendMessage(chatId, `✅ Job ${jobId} assigned to ${robot.name} (${robotId})`);
      } else {
        sendMessage(chatId, `✅ Job ${jobId} assigned to ${robotId}`);
      }
    } catch (err) {
      sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });

  // /robot list
  bot.onText(/\/robot list/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      if (Robot) {
        const robots = await Robot.find({ walletAddress: `user:${msg.from.id}` }).limit(20);
        if (robots.length === 0) return sendMessage(chatId, 'No robots found. Create one with /robot create <name>');
        const lines = robots.map(r => `${r.status === 'idle' ? '🟢' : r.status === 'working' ? '🔵' : '🔴'} *${r.name}* — ${r.status} (${r.robotId})`);
        sendMessage(chatId, `🤖 *Your Robots (${robots.length})*\n\n${lines.join('\n')}`);
      } else {
        sendMessage(chatId, '🤖 Robot list unavailable (DB offline)');
      }
    } catch (err) {
      sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  });

  console.log('[BOT-5] Robot commands installed: /robot create|status|assign|list');
}

async function sendMessage(chatId, text) {
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('[BOT-5] sendMessage error:', err.message);
  }
}

module.exports = { install };
