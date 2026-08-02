const Bounty = require('../models/Bounty');

exports.create = async (req, res) => {
  try {
    const { title, description, issueNumber, issueUrl, repository, amount } = req.body;
    const bounty = new Bounty({
      title,
      description,
      issueNumber,
      issueUrl,
      repository,
      amount,
      createdBy: req.userId
    });
    await bounty.save();
    res.status(201).json({ success: true, message: 'Bounty creato', data: bounty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const bounties = await Bounty.find();
    res.json({ success: true, data: bounties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Bounty.countDocuments();
    const completed = await Bounty.countDocuments({ status: 'completed' });
    const inProgress = await Bounty.countDocuments({ status: 'in-progress' });
    const open = await Bounty.countDocuments({ status: 'open' });
    res.json({
      success: true,
      data: { total, completed, inProgress, open }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.assign = async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found' });
    bounty.status = 'in-progress';
    bounty.assignedToUsername = req.body.assignedToUsername;
    bounty.assignedToWallet = req.body.walletAddress;
    await bounty.save();
    res.json({ success: true, message: 'Bounty assegnato', data: bounty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.complete = async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found' });
    bounty.status = 'completed';
    bounty.paymentTxHash = req.body.paymentTxHash;
    bounty.prNumber = req.body.prNumber;
    bounty.prUrl = req.body.prUrl;
    await bounty.save();
    res.json({ success: true, message: 'Bounty completato', data: bounty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
