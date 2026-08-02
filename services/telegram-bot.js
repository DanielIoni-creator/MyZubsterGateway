const TelegramBot = require('node-telegram-bot-api');
const Robot = require('../models/Robot');
const Escrow = require('../models/Escrow');
const Transaction = require('../models/Transaction');

class MyZubsterBot {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
  }

  setupCommands() {
    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, `
🤖 **MyZubster Robot Bot**

Benvenuto! Ecco cosa posso fare:

/register - Registra un robot
/recharge - Richiedi ricarica (x402)
/status - Stato del robot
/clone - Clona un robot
/escrow - Crea un escrow
/fees - Visualizza le fee

🌱 **Fee:** 2% MyZubster, 8% Bosco, 5% Referral
      `);
    });

    // Comando /register
    this.bot.onText(/\/register (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const [name, owner] = match[1].split(' ');

      try {
        const robot = new Robot({
          id: `robot_${Date.now()}`,
          name: name,
          owner: owner,
          walletAddress: `4A2B${Math.random().toString(36).substring(2, 10)}`
        });
        await robot.save();

        this.bot.sendMessage(chatId, `
✅ **Robot registrato!**

📌 **ID:** ${robot.id}
📛 **Nome:** ${robot.name}
💰 **Wallet:** ${robot.walletAddress}
🔋 **Batteria:** 100%

Usa /recharge per richiedere una ricarica.
        `);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
      }
    });

    // Comando /recharge
    this.bot.onText(/\/recharge (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const [robotId, amount] = match[1].split(' ');

      try {
        const robot = await Robot.findOne({ id: robotId });
        if (!robot) {
          return this.bot.sendMessage(chatId, '❌ Robot non trovato');
        }

        const fee = amount * 0.02;
        const boscoFee = amount * 0.08;
        const total = amount + fee + boscoFee;

        this.bot.sendMessage(chatId, `
⚡ **Richiesta ricarica (x402)**

💰 **Importo:** ${amount} XMR
💸 **Fee (2%):** ${fee} XMR
🌳 **Bosco (8%):** ${boscoFee} XMR
📦 **Totale:** ${total} XMR

📫 **Indirizzo:** ${robot.walletAddress}

Invia ${total} XMR all'indirizzo sopra.
        `);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
      }
    });

    // Comando /status
    this.bot.onText(/\/status (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const robotId = match[1];

      try {
        const robot = await Robot.findOne({ id: robotId });
        if (!robot) {
          return this.bot.sendMessage(chatId, '❌ Robot non trovato');
        }

        this.bot.sendMessage(chatId, `
📊 **Stato robot**

📌 **ID:** ${robot.id}
📛 **Nome:** ${robot.name}
🔋 **Batteria:** ${robot.batteryLevel}%
💰 **Wallet:** ${robot.walletAddress}
🔄 **Referrer:** ${robot.referrer || 'Nessuno'}
📅 **Creato:** ${robot.createdAt}
        `);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
      }
    });

    // Comando /fees
    this.bot.onText(/\/fees (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const referrer = match[1];

      try {
        const referrals = await Referral.find({ referrer: referrer });
        const totalFees = referrals.reduce((sum, r) => sum + r.feeCollected, 0);

        this.bot.sendMessage(chatId, `
💰 **Fee accumulate**

👤 **Referrer:** ${referrer}
📊 **Robot clonati:** ${referrals.length}
💵 **Totale fee:** ${totalFees} XMR

Usa /withdraw per ritirare le fee.
        `);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
      }
    });
  }

  sendNotification(chatId, message) {
    this.bot.sendMessage(chatId, message);
  }
}

module.exports = MyZubsterBot;
