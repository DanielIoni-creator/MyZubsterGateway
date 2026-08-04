// src/agents/memory/index.js
class AgentMemory {
  constructor() {
    this.shortTerm = [];
    this.longTerm = new Map();
    this.episodic = [];
    this.maxShortTerm = 50;
  }

  // Short-term memory (conversation context)
  addShortTerm(entry) {
    this.shortTerm.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    if (this.shortTerm.length > this.maxShortTerm) {
      this.shortTerm.shift();
    }
  }

  getShortTerm(limit = 10) {
    return this.shortTerm.slice(-limit);
  }

  // Long-term memory (persistent storage)
  async storeLongTerm(key, value, metadata = {}) {
    this.longTerm.set(key, {
      value,
      metadata,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  async retrieveLongTerm(key) {
    return this.longTerm.get(key) || null;
  }

  async searchLongTerm(query) {
    const results = [];
    for (const [key, data] of this.longTerm) {
      if (key.includes(query) || JSON.stringify(data.value).includes(query)) {
        results.push({ key, ...data });
      }
    }
    return results.slice(0, 10);
  }

  // Episodic memory (event history)
  addEvent(event) {
    this.episodic.push({
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  getEvents(type, limit = 10) {
    const filtered = this.episodic.filter(e => e.type === type);
    return filtered.slice(-limit);
  }

  // Stats
  getStats() {
    return {
      shortTermSize: this.shortTerm.length,
      longTermSize: this.longTerm.size,
      episodicSize: this.episodic.length,
      maxShortTerm: this.maxShortTerm
    };
  }

  // Clear
  clearShortTerm() {
    this.shortTerm = [];
  }

  clearEpisodic() {
    this.episodic = [];
  }
}

module.exports = { AgentMemory };
