// src/agents/base-agent.js
class BaseAgent {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.memory = config.memory || null;
    this.lastTask = null;
    this.stats = {
      tasksProcessed: 0,
      errors: 0,
      lastActivity: null
    };
  }

  async process(data, context = {}) {
    try {
      this.stats.tasksProcessed++;
      this.stats.lastActivity = new Date();
      this.lastTask = { data, context, timestamp: new Date() };
      
      const result = await this.execute(data, context);
      return {
        success: true,
        agent: this.name,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        agent: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async execute(data, context) {
    throw new Error('execute() must be implemented by subclass');
  }

  getStatus() {
    return {
      name: this.name,
      role: this.role,
      stats: this.stats,
      lastTask: this.lastTask
    };
  }
}

module.exports = { BaseAgent };
