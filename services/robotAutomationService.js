// services/robotAutomationService.js - Automazione agenti robot autonomi
const Robot = require('../models/Robot');
const Job = require('../models/Job');

class RobotAutomationService {
  // Selezione automatica del robot migliore per un job
  async selectBestRobot(jobRequirements) {
    const { skills, location, budget, urgency } = jobRequirements;
    const robots = await Robot.find({ status: 'available', active: true });

    if (robots.length === 0) throw new Error('No available robots');

    const scored = robots.map(robot => {
      let score = 0;
      const matchingSkills = skills.filter(s => robot.skills.includes(s));
      score += matchingSkills.length * 25;
      score += (robot.successRate || 0) * 10;
      if (urgency === 'high') score += robot.avgResponseTime < 5 ? 15 : 0;
      if (budget && robot.hourlyRate <= budget / 10) score += 10;
      score += (robot.rating || 3) * 5;
      return { robot, score, matchingSkills: matchingSkills.length };
    });

    scored.sort((a, b) => b.score - a.score);
    return {
      selected: scored[0].robot,
      alternatives: scored.slice(1, 3).map(s => s.robot._id),
      matchDetails: {
        score: scored[0].score,
        matchingSkills: scored[0].matchingSkills,
        totalSkills: skills.length
      }
    };
  }

  // Ottimizzazione automatica dei job
  async optimizeJobs() {
    const pendingJobs = await Job.find({ status: 'pending', autoAssign: true })
      .sort({ priority: -1, createdAt: 1 });

    const results = [];
    for (const job of pendingJobs) {
      try {
        const selection = await this.selectBestRobot({
          skills: job.requiredSkills || [],
          urgency: job.priority > 7 ? 'high' : 'normal',
          budget: job.budget
        });

        job.assignedRobot = selection.selected._id;
        job.status = 'assigned';
        job.assignedAt = new Date();
        job.autoAssigned = true;
        await job.save();

        results.push({
          jobId: job._id,
          robotId: selection.selected._id,
          score: selection.matchDetails.score,
          status: 'assigned'
        });
      } catch (e) {
        results.push({ jobId: job._id, error: e.message, status: 'failed' });
      }
    }
    return { optimized: results.filter(r => r.status === 'assigned').length, total: pendingJobs.length, results };
  }

  // Monitoraggio autonomo robot attivi
  async monitorRobots() {
    const robots = await Robot.find({ active: true });
    const status = [];

    for (const robot of robots) {
      const activeJobs = await Job.countDocuments({ assignedRobot: robot._id, status: { $in: ['assigned', 'in_progress'] } });
      const recentJobs = await Job.find({ assignedRobot: robot._id })
        .sort({ updatedAt: -1 }).limit(10);
      const recentSuccess = recentJobs.filter(j => j.status === 'completed').length;

      const health = {
        robotId: robot._id,
        name: robot.name,
        activeJobs,
        capacity: robot.maxConcurrentJobs || 5,
        utilization: activeJobs / (robot.maxConcurrentJobs || 5),
        recentSuccessRate: recentJobs.length ? recentSuccess / recentJobs.length : 1,
        status: activeJobs >= (robot.maxConcurrentJobs || 5) ? 'at_capacity' : 'available',
        needsMaintenance: recentJobs.length >= 100 && (recentSuccess / recentJobs.length) < 0.8
      };

      if (health.needsMaintenance) {
        await Robot.findByIdAndUpdate(robot._id, { needsMaintenance: true });
      }

      status.push(health);
    }

    return {
      total: robots.length,
      available: status.filter(s => s.status === 'available').length,
      atCapacity: status.filter(s => s.status === 'at_capacity').length,
      needsMaintenance: status.filter(s => s.needsMaintenance).length,
      robots: status
    };
  }

  // Dashboard agenti — statistiche aggregate
  async getAgentDashboard() {
    const [totalRobots, totalJobs, activeJobs, completedToday] = await Promise.all([
      Robot.countDocuments({ active: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
      Job.countDocuments({ status: 'completed', updatedAt: { $gte: new Date(Date.now() - 86400000) } })
    ]);

    const topRobots = await Job.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$assignedRobot', jobs: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { jobs: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'robots', localField: '_id', foreignField: '_id', as: 'robot' } },
      { $unwind: '$robot' },
      { $project: { name: '$robot.name', jobs: 1, avgRating: { $round: ['$avgRating', 1] } } }
    ]);

    const autoAssignmentRate = await Job.countDocuments({ autoAssigned: true });
    const totalAssigned = await Job.countDocuments({ assignedRobot: { $exists: true } });

    return {
      summary: { totalRobots, totalJobs, activeJobs, completedToday },
      autoAssignment: { autoAssigned: autoAssignmentRate, totalAssigned, rate: totalAssigned ? (autoAssignmentRate / totalAssigned * 100).toFixed(1) : 0 },
      topRobots
    };
  }
}

module.exports = new RobotAutomationService();
