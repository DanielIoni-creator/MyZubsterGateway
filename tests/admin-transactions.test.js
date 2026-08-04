const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');

const ADMIN_ID = '000000000000000000000001';
const BUYER_ID = new mongoose.Types.ObjectId().toString();
const TRANSACTION_ID = new mongoose.Types.ObjectId().toString();
const MONERO_ADDRESS = `4${'A'.repeat(94)}`;

jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer admin-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = {
    _id: '000000000000000000000001',
    id: '000000000000000000000001',
    role: req.get('X-Test-Role') || 'admin',
  };
  return next();
});

jest.mock('../middleware/admin', () => ({
  authorizeAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin required' });
    }
    return next();
  },
  logAdminAction: () => (req, res, next) => next(),
}));

const makeQuery = (value) => {
  const promise = Promise.resolve(value);
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    populate: jest.fn(() => query),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return query;
};

jest.mock('../models/Transaction', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../services/moneroService', () => ({
  verifyTransaction: jest.fn(),
  sendTransaction: jest.fn(),
}));

const Transaction = require('../models/Transaction');
const moneroService = require('../services/moneroService');
const adminRoutes = require('../src/routes/admin');

describe('admin Monero transaction API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
    app.use((error, req, res, next) => {
      res.status(500).json({ success: false, error: error.message });
    });
  });

  it('requires authentication for transaction monitoring', async () => {
    await request(app)
      .get('/api/admin/transactions')
      .expect(401);

    expect(Transaction.find).not.toHaveBeenCalled();
  });

  it('requires the admin role after authentication', async () => {
    await request(app)
      .get('/api/admin/transactions')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Test-Role', 'user')
      .expect(403);

    expect(Transaction.find).not.toHaveBeenCalled();
  });

  it('lists transactions with bounded pagination and supported filters', async () => {
    const rows = [{ _id: TRANSACTION_ID, status: 'confirmed' }];
    const query = makeQuery(rows);
    Transaction.find.mockReturnValue(query);
    Transaction.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/admin/transactions')
      .set('Authorization', 'Bearer admin-token')
      .query({
        status: 'confirmed',
        user: BUYER_ID,
        minAmount: '0.1',
        maxAmount: '2',
        from: '2026-07-01T00:00:00Z',
        to: '2026-07-31T23:59:59Z',
        page: '2',
        limit: '500',
      })
      .expect(200);

    const filter = Transaction.find.mock.calls[0][0];
    expect(filter).toEqual(expect.objectContaining({
      status: 'confirmed',
      $or: [{ fromUser: BUYER_ID }, { toUser: BUYER_ID }],
      amount: { $gte: 0.1, $lte: 2 },
    }));
    expect(filter.createdAt.$gte).toEqual(new Date('2026-07-01T00:00:00Z'));
    expect(filter.createdAt.$lte).toEqual(new Date('2026-07-31T23:59:59Z'));
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(query.skip).toHaveBeenCalledWith(100);
    expect(query.limit).toHaveBeenCalledWith(100);
    expect(response.body.data.pagination).toEqual({
      page: 2,
      limit: 100,
      total: 1,
      pages: 1,
    });
  });

  it('rejects malformed filters before querying MongoDB', async () => {
    const response = await request(app)
      .get('/api/admin/transactions?status=unknown&minAmount=5&maxAmount=1')
      .set('Authorization', 'Bearer admin-token')
      .expect(400);

    expect(response.body.error).toMatch(/status must be one of/);
    expect(Transaction.find).not.toHaveBeenCalled();
  });

  it('returns a populated transaction detail', async () => {
    const transaction = { _id: TRANSACTION_ID, status: 'pending' };
    const query = makeQuery(transaction);
    Transaction.findById.mockReturnValue(query);

    const response = await request(app)
      .get(`/api/admin/transactions/${TRANSACTION_ID}`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(query.populate).toHaveBeenCalledTimes(3);
    expect(response.body.data.transaction._id).toBe(TRANSACTION_ID);
  });

  it('manually verifies a pending transaction through the Monero service', async () => {
    const existing = { _id: TRANSACTION_ID, status: 'pending' };
    const updated = { ...existing, status: 'confirmed', verifiedBy: ADMIN_ID };
    Transaction.findById.mockReturnValue(makeQuery(existing));
    moneroService.verifyTransaction.mockResolvedValue({
      status: 'confirmed',
      txHash: 'chain-tx-id',
    });
    Transaction.findByIdAndUpdate.mockResolvedValue(updated);

    const response = await request(app)
      .post(`/api/admin/transactions/${TRANSACTION_ID}/verify`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(moneroService.verifyTransaction).toHaveBeenCalledWith(existing);
    expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
      TRANSACTION_ID,
      {
        $set: expect.objectContaining({
          verifiedBy: ADMIN_ID,
          verificationSource: 'admin',
        }),
      },
      { new: true, runValidators: true }
    );
    expect(response.body.data.verification.status).toBe('confirmed');
  });

  it('locks a confirmed transaction before sending a refund', async () => {
    const transaction = {
      _id: TRANSACTION_ID,
      fromUser: { _id: BUYER_ID, moneroAddress: MONERO_ADDRESS },
      amount: 0.5,
      amountPaid: 0.5,
      status: 'confirmed',
    };
    Transaction.findById.mockReturnValue(makeQuery(transaction));
    Transaction.findOneAndUpdate.mockResolvedValue({
      ...transaction,
      status: 'refund_pending',
    });
    moneroService.sendTransaction.mockResolvedValue({ tx_hash: 'refund-chain-tx-id' });
    Transaction.findByIdAndUpdate.mockResolvedValue({
      ...transaction,
      status: 'refunded',
      refundTxid: 'refund-chain-tx-id',
    });

    const response = await request(app)
      .post(`/api/admin/transactions/${TRANSACTION_ID}/refund`)
      .set('Authorization', 'Bearer admin-token')
      .send({ destinationAddress: MONERO_ADDRESS, amount: 0.4 })
      .expect(200);

    expect(Transaction.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: TRANSACTION_ID, status: 'confirmed' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'refund_pending',
          refundAmount: 0.4,
        }),
      }),
      { new: true, runValidators: true }
    );
    expect(moneroService.sendTransaction).toHaveBeenCalledWith(MONERO_ADDRESS, 0.4);
    expect(response.body.data.transaction.status).toBe('refunded');
  });

  it('fails closed when the configured Monero service cannot refund', async () => {
    const transaction = {
      _id: TRANSACTION_ID,
      fromUser: { _id: BUYER_ID, moneroAddress: MONERO_ADDRESS },
      amount: 0.5,
      status: 'confirmed',
    };
    Transaction.findById.mockReturnValue(makeQuery(transaction));
    const sendTransaction = moneroService.sendTransaction;
    moneroService.sendTransaction = undefined;

    try {
      const response = await request(app)
        .post(`/api/admin/transactions/${TRANSACTION_ID}/refund`)
        .set('Authorization', 'Bearer admin-token')
        .send({ destinationAddress: MONERO_ADDRESS })
        .expect(501);

      expect(response.body.error).toMatch(/not supported/);
      expect(Transaction.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      moneroService.sendTransaction = sendTransaction;
    }
  });

  it('keeps the refund locked if persistence fails after the wallet sends it', async () => {
    const transaction = {
      _id: TRANSACTION_ID,
      fromUser: { _id: BUYER_ID, moneroAddress: MONERO_ADDRESS },
      amount: 0.5,
      status: 'confirmed',
    };
    Transaction.findById.mockReturnValue(makeQuery(transaction));
    Transaction.findOneAndUpdate.mockResolvedValue({
      ...transaction,
      status: 'refund_pending',
    });
    moneroService.sendTransaction.mockResolvedValue({ tx_hash: 'refund-chain-tx-id' });
    Transaction.findByIdAndUpdate
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(transaction);

    const response = await request(app)
      .post(`/api/admin/transactions/${TRANSACTION_ID}/refund`)
      .set('Authorization', 'Bearer admin-token')
      .send({ destinationAddress: MONERO_ADDRESS })
      .expect(500);

    expect(response.body.error).toMatch(/refund-chain-tx-id/);
    expect(Transaction.findByIdAndUpdate.mock.calls[1][1]).toEqual({
      $set: expect.objectContaining({
        refundTxid: 'refund-chain-tx-id',
        refundError: expect.stringMatching(/persistence failed/),
      }),
    });
    expect(Transaction.findByIdAndUpdate.mock.calls[1][1].$set.status).toBeUndefined();
  });

  it('restores confirmed status when the wallet RPC rejects a refund', async () => {
    const transaction = {
      _id: TRANSACTION_ID,
      fromUser: { _id: BUYER_ID, moneroAddress: MONERO_ADDRESS },
      amount: 0.5,
      amountPaid: 0.5,
      status: 'confirmed',
    };
    Transaction.findById.mockReturnValue(makeQuery(transaction));
    Transaction.findOneAndUpdate.mockResolvedValue({
      ...transaction,
      status: 'refund_pending',
    });
    moneroService.sendTransaction.mockRejectedValue(new Error('wallet unavailable'));
    Transaction.findByIdAndUpdate.mockResolvedValue(transaction);

    const response = await request(app)
      .post(`/api/admin/transactions/${TRANSACTION_ID}/refund`)
      .set('Authorization', 'Bearer admin-token')
      .send({ destinationAddress: MONERO_ADDRESS })
      .expect(502);

    expect(response.body.error).toMatch(/wallet unavailable/);
    expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
      TRANSACTION_ID,
      {
        $set: expect.objectContaining({
          status: 'confirmed',
          refundError: 'wallet unavailable',
        }),
      },
      { runValidators: true }
    );
  });
});
