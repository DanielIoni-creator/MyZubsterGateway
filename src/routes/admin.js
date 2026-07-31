const express = require('express');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const { authorizeAdmin, logAdminAction } = require('../../middleware/admin');
const Transaction = require('../../models/Transaction');
const moneroService = require('../../services/moneroService');

const router = express.Router();

const TRANSACTION_STATUSES = new Set([
  'pending',
  'confirmed',
  'completed',
  'failed',
  'refund_pending',
  'refunded',
]);
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;
const MONERO_ADDRESS_PATTERN =
  /^[48][1-9A-HJ-NP-Za-km-z]{94}(?:[1-9A-HJ-NP-Za-km-z]{11})?$/;

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parsePositiveInteger = (value, fallback, maximum) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new RequestError('page and limit must be positive integers');
  }

  return Math.min(parsed, maximum);
};

const parseNonNegativeNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new RequestError(`${fieldName} must be a non-negative number`);
  }
  return parsed;
};

const parseDate = (value, fieldName) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RequestError(`${fieldName} must be a valid date`);
  }
  return parsed;
};

const buildTransactionFilter = (query) => {
  const filter = {};

  if (query.status) {
    if (!TRANSACTION_STATUSES.has(query.status)) {
      throw new RequestError(`status must be one of: ${[...TRANSACTION_STATUSES].join(', ')}`);
    }
    filter.status = query.status;
  }

  const userId = query.user || query.userId || query.buyerId;
  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new RequestError('user must be a valid MongoDB object id');
    }
    filter.$or = [{ fromUser: userId }, { toUser: userId }];
  }

  if (query.amount !== undefined) {
    filter.amount = parseNonNegativeNumber(query.amount, 'amount');
  } else if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.$gte = parseNonNegativeNumber(query.minAmount, 'minAmount');
    }
    if (query.maxAmount !== undefined) {
      filter.amount.$lte = parseNonNegativeNumber(query.maxAmount, 'maxAmount');
    }
    if (
      filter.amount.$gte !== undefined &&
      filter.amount.$lte !== undefined &&
      filter.amount.$gte > filter.amount.$lte
    ) {
      throw new RequestError('minAmount cannot be greater than maxAmount');
    }
  }

  const fromValue = query.from || query.startDate || query.dateFrom;
  const toValue = query.to || query.endDate || query.dateTo;
  if (query.date && (fromValue || toValue)) {
    throw new RequestError('date cannot be combined with date range filters');
  }

  if (query.date) {
    const day = parseDate(query.date, 'date');
    const start = new Date(day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  } else if (fromValue || toValue) {
    filter.createdAt = {};
    if (fromValue) {
      filter.createdAt.$gte = parseDate(fromValue, 'from');
    }
    if (toValue) {
      filter.createdAt.$lte = parseDate(toValue, 'to');
    }
    if (
      filter.createdAt.$gte &&
      filter.createdAt.$lte &&
      filter.createdAt.$gte > filter.createdAt.$lte
    ) {
      throw new RequestError('from cannot be later than to');
    }
  }

  return filter;
};

const getAdminId = (req) => req.user?._id || req.user?.id;

const ensureValidTransactionId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new RequestError('transaction id must be a valid MongoDB object id');
  }
};

router.use(auth, authorizeAdmin);

router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: { stats: {} } });
});

router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const filter = buildTransactionFilter(req.query);
    const page = parsePositiveInteger(req.query.page, 1, MAX_PAGE);
    const limit = parsePositiveInteger(req.query.limit, 25, MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', 'username email moneroAddress')
        .populate('toUser', 'username email moneroAddress')
        .populate('order offer request'),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

router.get(
  '/transactions/:id',
  asyncHandler(async (req, res) => {
    ensureValidTransactionId(req.params.id);

    const transaction = await Transaction.findById(req.params.id)
      .populate('fromUser', 'username email moneroAddress')
      .populate('toUser', 'username email moneroAddress')
      .populate('order offer request');

    if (!transaction) {
      throw new RequestError('Transaction not found', 404);
    }

    res.json({ success: true, data: { transaction } });
  })
);

router.post(
  '/transactions/:id/verify',
  logAdminAction('transaction.verify'),
  asyncHandler(async (req, res) => {
    ensureValidTransactionId(req.params.id);

    const existing = await Transaction.findById(req.params.id);
    if (!existing) {
      throw new RequestError('Transaction not found', 404);
    }

    if (
      existing.status === 'confirmed' ||
      existing.status === 'completed' ||
      existing.status === 'refunded'
    ) {
      return res.json({
        success: true,
        data: {
          transaction: existing,
          verification: {
            status: existing.status,
            alreadyVerified: true,
          },
        },
      });
    }

    const verification = await moneroService.verifyTransaction(existing);
    if (verification.status === 'error') {
      throw new RequestError(
        `Monero verification failed: ${verification.error || 'unknown wallet RPC error'}`,
        502
      );
    }

    const auditFields = {
      verifiedAt: new Date(),
      verifiedBy: getAdminId(req),
      verificationSource: 'admin',
      updatedAt: new Date(),
    };
    if (verification.status === 'confirmed') {
      auditFields.status = 'confirmed';
      auditFields.confirmations = verification.confirmations || 0;
      auditFields.confirmedAt = existing.confirmedAt || new Date();
      if (verification.txHash) {
        auditFields.transactionHash = verification.txHash;
      }
    } else if (verification.status === 'failed') {
      auditFields.status = 'failed';
    }

    const transaction = await Transaction.findByIdAndUpdate(
      existing._id,
      { $set: auditFields },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        transaction,
        verification,
      },
    });
  })
);

router.post(
  '/transactions/:id/refund',
  logAdminAction('transaction.refund'),
  asyncHandler(async (req, res) => {
    ensureValidTransactionId(req.params.id);

    const transaction = await Transaction.findById(req.params.id)
      .populate('fromUser', 'moneroAddress');
    if (!transaction) {
      throw new RequestError('Transaction not found', 404);
    }

    if (transaction.status === 'refunded') {
      return res.json({
        success: true,
        data: { transaction, alreadyRefunded: true },
      });
    }
    if (transaction.status === 'refund_pending') {
      throw new RequestError('A refund is already in progress', 409);
    }
    if (transaction.status !== 'confirmed' && transaction.status !== 'completed') {
      throw new RequestError('Only confirmed or completed transactions can be refunded', 409);
    }
    if (typeof moneroService.sendTransaction !== 'function') {
      throw new RequestError('Refunds are not supported by the configured Monero service', 501);
    }

    const body = req.body || {};
    const destinationAddress =
      body.destinationAddress || transaction.fromUser?.moneroAddress;
    if (!destinationAddress) {
      throw new RequestError(
        'destinationAddress is required when the buyer has no Monero address'
      );
    }
    if (!MONERO_ADDRESS_PATTERN.test(destinationAddress)) {
      throw new RequestError('destinationAddress must be a valid Monero address');
    }

    const paidAmount = Number(transaction.amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      throw new RequestError('The transaction has no refundable amount', 409);
    }
    const refundAmount =
      body.amount === undefined
        ? paidAmount
        : parseNonNegativeNumber(body.amount, 'amount');
    if (refundAmount <= 0) {
      throw new RequestError('amount must be greater than zero');
    }
    if (refundAmount > paidAmount) {
      throw new RequestError('amount cannot exceed the amount paid');
    }

    const requestedAt = new Date();
    const adminId = getAdminId(req);
    const locked = await Transaction.findOneAndUpdate(
      { _id: transaction._id, status: transaction.status },
      {
        $set: {
          status: 'refund_pending',
          refundRequestedAt: requestedAt,
          refundRequestedBy: adminId,
          refundAddress: destinationAddress,
          refundAmount,
          updatedAt: requestedAt,
        },
        $unset: { refundError: 1, refundFailedAt: 1 },
      },
      { new: true, runValidators: true }
    );

    if (!locked) {
      throw new RequestError('Transaction state changed; refund was not started', 409);
    }

    let result;
    try {
      result = await moneroService.sendTransaction(destinationAddress, refundAmount);
    } catch (error) {
      const failedAt = new Date();
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            status: transaction.status,
            refundError: error.message,
            refundFailedAt: failedAt,
            updatedAt: failedAt,
          },
        },
        { runValidators: true }
      );
      throw new RequestError(`Refund failed: ${error.message}`, 502);
    }

    const refundTxid = result?.tx_hash || result?.txHash;
    if (!refundTxid) {
      const failedAt = new Date();
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            refundError: 'Monero wallet RPC returned no transaction hash',
            refundFailedAt: failedAt,
            updatedAt: failedAt,
          },
        },
        { runValidators: true }
      );
      throw new RequestError(
        'Refund outcome is unknown and remains locked for reconciliation',
        502
      );
    }

    const refundedAt = new Date();
    try {
      const refunded = await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            status: 'refunded',
            refundTxid,
            refundedAt,
            refundedBy: adminId,
            updatedAt: refundedAt,
          },
        },
        { new: true, runValidators: true }
      );

      return res.json({
        success: true,
        data: { transaction: refunded },
      });
    } catch (error) {
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            refundTxid,
            refundError: `Refund sent; persistence failed: ${error.message}`,
            refundFailedAt: new Date(),
          },
        },
        { runValidators: true }
      ).catch(() => {});
      throw new RequestError(
        `Refund ${refundTxid} was sent and remains locked for reconciliation`,
        500
      );
    }
  })
);

router.use((error, req, res, next) => {
  if (!error.status) {
    return next(error);
  }
  return res.status(error.status).json({
    success: false,
    error: error.message,
  });
});

module.exports = router;
