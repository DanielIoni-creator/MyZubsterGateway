// services/scheduler.js — Robot Scheduler per EVA IONI — Bounty #786
const mongoose = require('mongoose');
const { notifyUser, notifyRobot } = require('../notifications');

// In-memory store (fallback if MongoDB non disponibile)
const jobs = new Map();
const robotStatuses = new Map();

class SchedulerService {
  constructor() {
    this.jobs = jobs;
    this.robotStatuses = robotStatuses;
  }

  // Registra un robot nel sistema
  registerRobot(robotId, capabilities = []) {
    this.robotStatuses.set(robotId, {
      robotId,
      status: 'idle',
      capabilities,
      currentJob: null,
      lastPing: Date.now(),
      totalJobsCompleted: 0,
      uptime: 0
    });
    return this.robotStatuses.get(robotId);
  }

  // Aggiungi un job alla coda
  async enqueueJob({ jobId, type, priority = 1, payload = {}, clientId }) {
    const job = {
      jobId,
      type,
      priority,
      payload,
      clientId,
      status: 'queued',
      createdAt: Date.now(),
      assignedTo: null,
      startedAt: null,
      completedAt: null
    };
    this.jobs.set(jobId, job);
    
    // Trigger assegnazione automatica
    await this.autoAssignJobs();
    return job;
  }

  // Assegna automaticamente i job ai robot disponibili
  async autoAssignJobs() {
    for (const [jobId, job] of this.jobs) {
      if (job.status !== 'queued') continue;
      
      // Trova robot idle con capabilities compatibili
      for (const [robotId, robot] of this.robotStatuses) {
        if (robot.status === 'idle' && (robot.capabilities.length === 0 || robot.capabilities.includes(job.type))) {
          robot.status = 'busy';
          robot.currentJob = jobId;
          job.status = 'assigned';
          job.assignedTo = robotId;
          job.startedAt = Date.now();
          
          await notifyRobot(robotId, "Nuovo job assegnato: " + job.jobId + " (" + job.type + ")");
          break;
        }
      }
    }
  }

  // Completa un job
  async completeJob(robotId, jobId, result = {}) {
    const job = this.jobs.get(jobId);
    const robot = this.robotStatuses.get(robotId);
    
    if (!job) throw new Error('Job non trovato');
    if (!robot) throw new Error('Robot non trovato');
    
    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;
    
    robot.status = 'idle';
    robot.currentJob = null;
    robot.totalJobsCompleted++;
    robot.lastPing = Date.now();
    
    await notifyUser(job.clientId, "Job " + jobId + " completato dal robot " + robotId);
    await this.autoAssignJobs();
    return job;
  }

  // Fallisci un job
  async failJob(jobId, reason) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job non trovato');
    
    job.status = 'failed';
    job.failureReason = reason;
    
    const robot = this.robotStatuses.get(job.assignedTo);
    if (robot) {
      robot.status = 'idle';
      robot.currentJob = null;
    }
    
    await notifyUser(job.clientId, "Job " + jobId + " fallito: " + reason);
    return job;
  }

  // Heartbeat / ping del robot
  pingRobot(robotId) {
    const robot = this.robotStatuses.get(robotId);
    if (!robot) throw new Error('Robot non registrato');
    robot.lastPing = Date.now();
    return robot;
  }

  // Dashboard di controllo
  getDashboard() {
    const queued = [...this.jobs.values()].filter(j => j.status === 'queued').length;
    const active = [...this.jobs.values()].filter(j => j.status === 'assigned').length;
    const completed = [...this.jobs.values()].filter(j => j.status === 'completed').length;
    const failed = [...this.jobs.values()].filter(j => j.status === 'failed').length;
    const idleRobots = [...this.robotStatuses.values()].filter(r => r.status === 'idle').length;
    const busyRobots = [...this.robotStatuses.values()].filter(r => r.status === 'busy').length;
    
    // Robot offline (no ping da > 5 minuti)
    const now = Date.now();
    const offlineRobots = [...this.robotStatuses.values()].filter(r => (now - r.lastPing) > 300000).length;

    return {
      jobs: { queued, active, completed, failed, total: this.jobs.size },
      robots: { total: this.robotStatuses.size, idle: idleRobots, busy: busyRobots, offline: offlineRobots },
      queueLength: queued,
      timestamp: new Date().toISOString()
    };
  }

  // Lista jobs in coda
  getQueue() {
    return [...this.jobs.values()]
      .filter(j => j.status === 'queued')
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  // Stato dettagliato robot
  getRobotStatus(robotId) {
    const robot = this.robotStatuses.get(robotId);
    if (!robot) throw new Error('Robot non trovato');
    return robot;
  }
}

module.exports = new SchedulerService();
