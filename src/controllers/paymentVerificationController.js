const PaymentVerification = require('../models/paymentVerificationModel');
const { v4: uuidv4 } = require('uuid');

exports.createVerification = async (req, res) => {
  try {
    const { txHash, blockchain, amount, currency, senderAddress, receiverAddress, requiredConfirmations } = req.body;
    if (!txHash || !blockchain || !amount)
      return res.status(400).json({ error: 'txHash, blockchain, and amount are required' });
    const v = new PaymentVerification({
      verificationId: uuidv4().substring(0, 12),
      txHash, blockchain, amount,
      currency: currency || 'MYZ',
      senderAddress, receiverAddress,
      requiredConfirmations: requiredConfirmations || 10,
      status: 'pending'
    });
    const recent = await PaymentVerification.find({ senderAddress }).sort({ createdAt: -1 }).limit(50);
    v.detectAnomalies(recent);
    await v.save();
    res.status(201).json({ message: 'Verification created', verificationId: v.verificationId, status: v.status, anomalies: v.anomalies.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getVerification = async (req, res) => {
  try {
    const v = await PaymentVerification.findOne({ verificationId: req.params.verificationId });
    if (!v) return res.status(404).json({ error: 'Verification not found' });
    v.checkConfirmations();
    v.generateReport();
    await v.save();
    res.json({
      verificationId: v.verificationId, txHash: v.txHash, blockchain: v.blockchain,
      amount: v.amount, currency: v.currency, status: v.status,
      confirmations: v.confirmations, requiredConfirmations: v.requiredConfirmations,
      blockHeight: v.blockHeight, anomalies: v.anomalies, report: v.report,
      createdAt: v.createdAt, verifiedAt: v.verifiedAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateConfirmations = async (req, res) => {
  try {
    const { confirmations, blockHeight } = req.body;
    if (confirmations === undefined) return res.status(400).json({ error: 'confirmations is required' });
    const v = await PaymentVerification.findOne({ verificationId: req.params.verificationId });
    if (!v) return res.status(404).json({ error: 'Verification not found' });
    v.confirmations = confirmations;
    if (blockHeight) v.blockHeight = blockHeight;
    if (v.status === 'pending' && confirmations > 0) v.status = 'confirming';
    v.checkConfirmations();
    await v.save();
    res.json({ message: 'Confirmations updated', status: v.status, confirmations: v.confirmations });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.runAnomalyCheck = async (req, res) => {
  try {
    const v = await PaymentVerification.findOne({ verificationId: req.params.verificationId });
    if (!v) return res.status(404).json({ error: 'Verification not found' });
    const recent = await PaymentVerification.find({ senderAddress: v.senderAddress }).sort({ createdAt: -1 }).limit(50);
    v.detectAnomalies(recent);
    v.generateReport();
    await v.save();
    res.json({ message: 'Anomaly check complete', anomalies: v.anomalies, status: v.status, report: v.report });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getReport = async (req, res) => {
  try {
    const v = await PaymentVerification.findOne({ verificationId: req.params.verificationId });
    if (!v) return res.status(404).json({ error: 'Verification not found' });
    v.generateReport();
    await v.save();
    res.json({ verificationId: v.verificationId, report: v.report, status: v.status, anomalies: v.anomalies });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.listVerifications = async (req, res) => {
  try {
    const { status, blockchain } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (blockchain) filter.blockchain = blockchain;
    const verifications = await PaymentVerification.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ count: verifications.length, verifications: verifications.map(v => ({
      verificationId: v.verificationId, txHash: v.txHash, blockchain: v.blockchain,
      amount: v.amount, status: v.status, confirmations: v.confirmations,
      anomalies: v.anomalies.length, createdAt: v.createdAt
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await PaymentVerification.countDocuments();
    const pending = await PaymentVerification.countDocuments({ status: 'pending' });
    const confirming = await PaymentVerification.countDocuments({ status: 'confirming' });
    const verified = await PaymentVerification.countDocuments({ status: 'verified' });
    const failed = await PaymentVerification.countDocuments({ status: 'failed' });
    const anomalies = await PaymentVerification.countDocuments({ status: 'anomaly' });
    const totalAnomalies = await PaymentVerification.aggregate([
      { $unwind: '$anomalies' },
      { $group: { _id: '$anomalies.type', count: { $sum: 1 } } }
    ]);
    res.json({ total, pending, confirming, verified, failed, anomalies, anomalyBreakdown: totalAnomalies });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
