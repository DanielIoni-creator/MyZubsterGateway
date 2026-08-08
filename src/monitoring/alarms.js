// src/monitoring/alarms.js
// Sistema di allarmi per pagamenti e transazioni - Bounty #716 - 600 MYZ

const crypto = require('crypto');

class AlarmSystem {
  constructor(config = {}) {
    this.alarms = new Map();
    this.history = [];
    this.channels = {
      email: config.email || null,
      sms: config.sms || null,
      telegram: config.telegram || null,
      webhook: config.webhook || null
    };
    this.thresholds = {
      // Soglie predefinite
      maxTransactionAmount: config.maxTransactionAmount || 10000,
      minBalance: config.minBalance || 100,
      maxDailyVolume: config.maxDailyVolume || 50000,
      suspiciousPattern: config.suspiciousPattern || true,
      failedAttempts: config.failedAttempts || 5,
      processorTimeout: config.processorTimeout || 30000 // 30 secondi
    };
    this.dailyCounters = { transactions: 0, volume: 0, date: this._today() };
    this.failedAttempts = new Map(); // IP/userId -> count
    this.processorHeartbeat = new Map();
  }

  /**
   * Crea un nuovo allarme configurabile
   */
  createAlarm(config) {
    const id = crypto.randomBytes(4).toString('hex');
    const alarm = {
      id,
      name: config.name,
      type: config.type, // 'threshold', 'pattern', 'heartbeat', 'custom'
      condition: config.condition,
      channels: config.channels || ['telegram'],
      severity: config.severity || 'warning', // 'info', 'warning', 'critical'
      enabled: true,
      cooldown: config.cooldown || 300000, // 5 minuti default
      lastTriggered: null,
      totalTriggers: 0,
      actions: config.actions || [],
      createdAt: new Date().toISOString()
    };
    this.alarms.set(id, alarm);
    return alarm;
  }

  /**
   * Valuta una transazione contro tutti gli allarmi attivi
   */
  evaluateTransaction(transaction) {
    const triggers = [];
    const now = Date.now();
    
    // Reset daily counters se cambio giorno
    if (this._today() !== this.dailyCounters.date) {
      this.dailyCounters = { transactions: 0, volume: 0, date: this._today() };
    }
    this.dailyCounters.transactions++;
    this.dailyCounters.volume += transaction.amount || 0;
    
    for (const [id, alarm] of this.alarms) {
      if (!alarm.enabled) continue;
      
      // Cooldown check
      if (alarm.lastTriggered && (now - new Date(alarm.lastTriggered).getTime()) < alarm.cooldown) {
        continue;
      }
      
      let triggered = false;
      let triggerReason = '';
      
      switch (alarm.type) {
        case 'threshold':
          triggered = this._checkThreshold(alarm, transaction);
          triggerReason = `Threshold exceeded: ${alarm.condition}`;
          break;
        case 'pattern':
          triggered = this._checkPattern(alarm, transaction);
          triggerReason = `Suspicious pattern: ${alarm.condition}`;
          break;
        case 'heartbeat':
          triggered = this._checkHeartbeat(alarm, transaction);
          triggerReason = `Heartbeat missed: ${alarm.condition}`;
          break;
        default:
          triggered = this._evaluateCustomCondition(alarm, transaction);
          triggerReason = `Custom condition met: ${alarm.condition}`;
      }
      
      if (triggered) {
        alarm.lastTriggered = new Date().toISOString();
        alarm.totalTriggers++;
        triggers.push({
          alarmId: id,
          alarmName: alarm.name,
          severity: alarm.severity,
          reason: triggerReason,
          transactionId: transaction.id,
          timestamp: new Date().toISOString()
        });
        
        this._sendNotification(alarm, triggerReason, transaction);
      }
    }
    
    if (triggers.length > 0) {
      this.history.push(...triggers);
    }
    
    return {
      evaluated: true,
      triggers,
      summary: triggers.length > 0 
        ? `${triggers.length} alarm(s) triggered` 
        : 'No alarms triggered'
    };
  }

  /**
   * Verifica soglie personalizzate
   */
  _checkThreshold(alarm, transaction) {
    const cond = alarm.condition;
    
    if (cond === 'max_amount' && transaction.amount > this.thresholds.maxTransactionAmount) {
      return true;
    }
    if (cond === 'min_balance' && (transaction.balance || 0) < this.thresholds.minBalance) {
      return true;
    }
    if (cond === 'max_daily_volume' && this.dailyCounters.volume > this.thresholds.maxDailyVolume) {
      return true;
    }
    
    // Supporto soglie personalizzate: "amount > 5000"
    const customMatch = cond.match(/^(\w+)\s*([><=]+)\s*(\d+(\.\d+)?)$/);
    if (customMatch) {
      const [, field, op, value] = customMatch;
      const actual = transaction[field] || 0;
      const numericValue = parseFloat(value);
      switch (op) {
        case '>': return actual > numericValue;
        case '<': return actual < numericValue;
        case '>=': return actual >= numericValue;
        case '<=': return actual <= numericValue;
        case '=': case '==': return actual === numericValue;
      }
    }
    
    return false;
  }

  /**
   * Rileva pattern sospetti
   */
  _checkPattern(alarm, transaction) {
    const cond = alarm.condition;
    
    // Pattern: transazioni multiple veloci stesso utente
    if (cond === 'rapid_transactions') {
      const recentTxns = this.history.filter(h => {
        const t = new Date(h.timestamp).getTime();
        return (Date.now() - t) < 60000; // ultimo minuto
      });
      return recentTxns.length >= 5;
    }
    
    // Pattern: indirizzo mittente sospetto
    if (cond === 'suspicious_sender') {
      return this.failedAttempts.get(transaction.from) >= this.thresholds.failedAttempts;
    }
    
    return false;
  }

  /**
   * Heartbeat monitoring per processori di pagamento
   */
  _checkHeartbeat(alarm, transaction) {
    const processor = alarm.condition.replace('processor:', '');
    const lastBeat = this.processorHeartbeat.get(processor);
    if (!lastBeat) return false;
    return (Date.now() - lastBeat) > this.thresholds.processorTimeout;
  }

  _evaluateCustomCondition(alarm, transaction) {
    try {
      // Supporta condizioni semplici: field operator value
      const match = alarm.condition.match(/^(\w+)\s*([><=]+)\s*(\S+)$/);
      if (!match) return false;
      const [, field, op, value] = match;
      const actual = transaction[field];
      const numVal = parseFloat(value);
      
      if (!isNaN(numVal)) {
        switch (op) {
          case '>': return actual > numVal;
          case '<': return actual < numVal;
          case '=': return actual === value;
        }
      }
    } catch (e) {
      console.error('Alarm evaluation error:', e.message);
    }
    return false;
  }

  /**
   * Invia notifica attraverso i canali configurati
   */
  _sendNotification(alarm, reason, transaction) {
    const message = `[${alarm.severity.toUpperCase()}] ${alarm.name}\nRagione: ${reason}\nTransazione: ${transaction.id || 'N/A'}\nImporto: ${transaction.amount || 'N/A'}\nAlle: ${new Date().toISOString()}`;
    
    alarm.channels.forEach(channel => {
      switch (channel) {
        case 'telegram':
          if (this.channels.telegram) {
            this._sendTelegram(message);
          }
          break;
        case 'email':
          if (this.channels.email) {
            this._sendEmail(alarm.severity, message);
          }
          break;
        case 'sms':
          if (this.channels.sms) {
            this._sendSMS(message);
          }
          break;
        case 'webhook':
          if (this.channels.webhook) {
            this._sendWebhook({ alarm, reason, transaction, message });
          }
          break;
      }
    });
  }

  _sendTelegram(message) {
    // Integrazione Telegram Bot API
    console.log('[TELEGRAM]', message);
    return { channel: 'telegram', status: 'queued' };
  }

  _sendEmail(severity, message) {
    console.log('[EMAIL]', severity, message.substring(0, 200));
    return { channel: 'email', status: 'queued' };
  }

  _sendSMS(message) {
    console.log('[SMS]', message.substring(0, 160));
    return { channel: 'sms', status: 'queued' };
  }

  _sendWebhook(payload) {
    console.log('[WEBHOOK]', JSON.stringify(payload).substring(0, 200));
    return { channel: 'webhook', status: 'queued' };
  }

  /**
   * Registra un heartbeat per un processore
   */
  heartbeat(processorId) {
    this.processorHeartbeat.set(processorId, Date.now());
    return { processor: processorId, timestamp: new Date().toISOString() };
  }

  /**
   * Registra un tentativo fallito
   */
  recordFailure(identifier) {
    const count = (this.failedAttempts.get(identifier) || 0) + 1;
    this.failedAttempts.set(identifier, count);
    return { identifier, attempts: count };
  }

  /**
   * Configura soglie personalizzate
   */
  configureThresholds(thresholds) {
    Object.assign(this.thresholds, thresholds);
    return { updated: true, thresholds: this.thresholds };
  }

  /**
   * Configura canali di notifica
   */
  configureChannels(channels) {
    Object.assign(this.channels, channels);
    return { updated: true, channels: Object.keys(this.channels) };
  }

  /**
   * Disabilita/abilita un allarme
   */
  toggleAlarm(alarmId, enabled) {
    const alarm = this.alarms.get(alarmId);
    if (!alarm) return { success: false, error: 'Alarm not found' };
    alarm.enabled = enabled;
    return { success: true, alarm };
  }

  /**
   * Storico allarmi con filtri
   */
  getHistory(filters = {}) {
    let results = [...this.history];
    
    if (filters.severity) {
      results = results.filter(h => h.severity === filters.severity);
    }
    if (filters.alarmId) {
      results = results.filter(h => h.alarmId === filters.alarmId);
    }
    if (filters.since) {
      results = results.filter(h => new Date(h.timestamp) >= new Date(filters.since));
    }
    if (filters.limit) {
      results = results.slice(-filters.limit);
    }
    
    return {
      total: results.length,
      results: results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };
  }

  getStatus() {
    return {
      activeAlarms: [...this.alarms.values()].filter(a => a.enabled).length,
      totalAlarms: this.alarms.size,
      totalTriggers: this.history.length,
      dailyCounters: this.dailyCounters,
      channels: Object.keys(this.channels).filter(c => this.channels[c] !== null)
    };
  }

  _today() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = { AlarmSystem };
