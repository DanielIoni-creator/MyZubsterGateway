// src/agents/orchestrator.js
const EventEmitter = require('events');
const { AgentMemory } = require('./memory');

class Orchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.memory = new AgentMemory();
    this.activeTasks = new Map();
    this.taskHistory = [];
  }

  registerAgent(name, agent) {
    this.agents.set(name, agent);
    this.memory.addEvent({
      type: 'orchestrator',
      action: 'register-agent',
      agent: name
    });
    console.log(`✅ Agent registered: ${name}`);
  }

  async executeTask(task) {
    const { type, data, context = {} } = task;
    const taskId = `${type}:${Date.now()}`;

    // 1. Get agent
    const agent = this.selectAgent(type);
    if (!agent) {
      throw new Error(`No agent available for task: ${type}`);
    }

    // 2. Check history
    const history = this.memory.getEvents(type, 5);

    // 3. Execute
    this.activeTasks.set(taskId, { task, status: 'running', startedAt: new Date() });

    try {
      const result = await agent.process(data, { ...context, history });
      
      this.activeTasks.set(taskId, { task, status: 'completed', result, completedAt: new Date() });
      this.taskHistory.push({ taskId, type, result, timestamp: new Date() });
      
      this.memory.addEvent({
        type: 'orchestrator',
        action: 'task-complete',
        taskId,
        status: 'success'
      });

      this.emit('task-complete', { taskId, result });
      return result;

    } catch (error) {
      this.activeTasks.set(taskId, { task, status: 'failed', error: error.message, completedAt: new Date() });
      
      this.memory.addEvent({
        type: 'orchestrator',
        action: 'task-failed',
        taskId,
        error: error.message
      });

      this.emit('task-failed', { taskId, error: error.message });
      throw error;
    }
  }

  selectAgent(taskType) {
    const mapping = {
      'investor': 'Investor Agent',
      'legal': 'Legal Agent',
      'compliance': 'Legal Agent',
      'technical': 'Technical Agent',
      'deployment': 'Technical Agent',
      'kyc': 'Investor Agent',
      'audit': 'Technical Agent'
    };

    const agentName = mapping[taskType];
    return this.agents.get(agentName) || null;
  }

  async getStatus() {
    const agentStatus = {};
    for (const [name, agent] of this.agents) {
      agentStatus[name] = agent.getStatus();
    }

    return {
      agents: agentStatus,
      activeTasks: this.activeTasks.size,
      totalTasks: this.taskHistory.length,
      memory: this.memory.getStats()
    };
  }

  getTaskStatus(taskId) {
    return this.activeTasks.get(taskId) || null;
  }

  getHistory(limit = 20) {
    return this.taskHistory.slice(-limit);
  }
}

module.exports = { Orchestrator };
