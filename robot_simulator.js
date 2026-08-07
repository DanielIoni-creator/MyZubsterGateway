// robot_simulator.js — Robot simulator for testing (BOT-4, closes #341)
// Simulates robot lifecycle: create → assign → execute → deliver
// Supports MYZ and XMR, configurable for load testing

const crypto = require('crypto');

class RobotSimulator {
  constructor(config = {}) {
    this.robots = new Map();
    this.jobs = new Map();
    this.logs = [];
    this.currency = config.currency || 'MYZ';
    this.executionDelay = config.executionDelay || 1000; // ms
    this.autoComplete = config.autoComplete !== false;
    this.failRate = config.failRate || 0; // 0-1 probability
  }

  // Create a simulated robot
  createRobot(name, type = 'basic') {
    const robotId = `sim-${crypto.randomUUID().slice(0, 8)}`;
    const robot = {
      robotId, name, type,
      status: 'idle',
      currentJob: null,
      stats: { jobsCompleted: 0, jobsFailed: 0, totalEarned: 0 },
      createdAt: new Date().toISOString()
    };
    this.robots.set(robotId, robot);
    this._log('robot:created', { robotId, name, type });
    return robot;
  }

  // Create a job and assign to robot
  createJob(robotId, jobData = {}) {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    if (robot.status !== 'idle') throw new Error(`Robot ${robotId} is busy (${robot.status})`);

    const jobId = `job-${crypto.randomUUID().slice(0, 8)}`;
    const amount = jobData.amount || this._randomAmount();
    const job = {
      jobId, robotId,
      description: jobData.description || `Simulated job ${jobId}`,
      amount,
      currency: this.currency,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    robot.status = 'working';
    robot.currentJob = jobId;
    this.jobs.set(jobId, job);
    this._log('job:assigned', { jobId, robotId, amount, currency: this.currency });

    // Simulate execution
    if (this.autoComplete) {
      setTimeout(() => this._executeJob(jobId), this.executionDelay);
    }

    return job;
  }

  // Internal job execution
  async _executeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'executing';
    job.startedAt = new Date().toISOString();
    this._log('job:started', { jobId, robotId: job.robotId });

    const willFail = Math.random() < this.failRate;
    const robot = this.robots.get(job.robotId);

    if (willFail) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      if (robot) {
        robot.status = 'idle';
        robot.currentJob = null;
        robot.stats.jobsFailed++;
      }
      this._log('job:failed', { jobId, robotId: job.robotId, reason: 'simulated failure' });
      return job;
    }

    // Simulate delivery
    job.status = 'delivering';
    this._log('job:delivering', { jobId, robotId: job.robotId });

    await this._sleep(this.executionDelay / 2);

    job.status = 'delivered';
    job.completedAt = new Date().toISOString();
    if (robot) {
      robot.status = 'idle';
      robot.currentJob = null;
      robot.stats.jobsCompleted++;
      robot.stats.totalEarned += job.amount;
    }
    this._log('job:delivered', { jobId, robotId: job.robotId, amount: job.amount });
    return job;
  }

  // Manually complete a job
  deliverJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.status = 'delivered';
    job.completedAt = new Date().toISOString();
    const robot = this.robots.get(job.robotId);
    if (robot) {
      robot.status = 'idle';
      robot.currentJob = null;
      robot.stats.jobsCompleted++;
      robot.stats.totalEarned += job.amount;
    }
    this._log('job:delivered', { jobId, robotId: job.robotId, manual: true });
    return job;
  }

  // Get all robots status
  getRobots() {
    return Array.from(this.robots.values()).map(r => ({
      robotId: r.robotId, name: r.name, type: r.type,
      status: r.status, currentJob: r.currentJob, stats: r.stats
    }));
  }

  // Get all jobs
  getJobs(status = null) {
    let jobs = Array.from(this.jobs.values());
    if (status) jobs = jobs.filter(j => j.status === status);
    return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get simulation summary
  getSummary() {
    const robots = Array.from(this.robots.values());
    const jobs = Array.from(this.jobs.values());
    return {
      totalRobots: robots.length,
      activeRobots: robots.filter(r => r.status !== 'idle').length,
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'delivered').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      pendingJobs: jobs.filter(j => ['assigned', 'executing', 'delivering'].includes(j.status)).length,
      totalEarned: robots.reduce((s, r) => s + r.stats.totalEarned, 0),
      currency: this.currency
    };
  }

  // Get action log
  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }

  // Load test: create N robots and assign M jobs
  async loadTest({ robotCount = 5, jobsPerRobot = 1, delay = 100 }) {
    const results = [];
    this.executionDelay = delay;
    for (let i = 0; i < robotCount; i++) {
      const robot = this.createRobot(`LoadBot-${i + 1}`, 'load-test');
      for (let j = 0; j < jobsPerRobot; j++) {
        const job = this.createJob(robot.robotId, { amount: 10 });
        results.push({ robot: robot.robotId, job: job.jobId });
      }
    }
    return {
      message: `Load test started: ${robotCount} robots, ${robotCount * jobsPerRobot} jobs`,
      results
    };
  }

  // Reset simulator
  reset() {
    this.robots.clear();
    this.jobs.clear();
    this.logs = [];
  }

  // Internal helpers
  _log(event, data) {
    this.logs.push({ timestamp: new Date().toISOString(), event, ...data });
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _randomAmount() {
    return Math.round((Math.random() * 90 + 10) * 100) / 100; // 10-100
  }
}

module.exports = RobotSimulator;
