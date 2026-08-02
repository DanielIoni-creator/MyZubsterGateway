const express = require('express');
const request = require('supertest');

// ── Mock data ──────────────────────────────────────────────────────────
const savedBounties = [];

const makeIssuePayload = (overrides = {}) => {
  const { issue: issueOverrides = {}, ...rest } = overrides;
  return {
    action: 'opened',
    issue: {
      number: 101,
      title: '[BOUNTY] Fix login bug',
      body: 'Bounty: 0.05 XMR\nFix the login bug.',
      labels: [{ name: 'bounty' }],
      user: { login: 'contributor1' },
      ...issueOverrides,
    },
    repository: { full_name: 'MyZubster-Ecosystem/MyZubsterGateway' },
    ...rest,
  };
};

const makePaymentResponse = (address = '4AbCdEfG1234567890moneroaddr') => ({
  data: { address, orderId: 'bounty_MyZubster-Ecosystem_MyZubsterGateway_101' },
});

// ── Mock Bounty model ─────────────────────────────────────────────────
const MockBounty = jest.fn().mockImplementation(function (data) {
  const instance = {
    ...data,
    save: jest.fn().mockImplementation(function () {
      savedBounties.push(this);
      return Promise.resolve(this);
    }),
    toObject() {
      return this;
    },
  };
  return instance;
});
MockBounty.findOne = jest.fn();
MockBounty.findOneAndUpdate = jest.fn();
MockBounty.find = jest.fn();

// ── Mock mongoose ─────────────────────────────────────────────────────
jest.mock('mongoose', () => {
  const mockQuery = {
    exec: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
  };

  return {
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      close: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      once: jest.fn(),
    },
    Schema: jest.fn().mockImplementation(() => ({
      pre: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
      index: jest.fn().mockReturnThis(),
      virtual: jest.fn().mockReturnThis(),
    })),
    model: jest.fn().mockImplementation((name) => {
      if (name === 'Bounty') return MockBounty;
      return {
        find: jest.fn().mockReturnValue(mockQuery),
        findOne: jest.fn().mockReturnValue(mockQuery),
        findById: jest.fn().mockReturnValue(mockQuery),
        save: jest.fn().mockResolvedValue({}),
        deleteOne: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        updateOne: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      };
    }),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || 'mock-id'),
    },
  };
});

// ── Mock axios ────────────────────────────────────────────────────────
jest.mock('axios');
const axios = require('axios');

// ── Load route ────────────────────────────────────────────────────────
const bountiesRouter = require('../routes/bounties');

// ── Tests ─────────────────────────────────────────────────────────────
describe('Bounty webhook system', () => {
  let app;

  beforeEach(() => {
    savedBounties.length = 0;
    jest.clearAllMocks();
    axios.post.mockReset();
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.PORT = '10000';

    app = express();
    app.use(express.json());
    app.use('/api/bounties', bountiesRouter);
  });

  afterAll(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.PORT;
  });

  // ════════════════════════════════════════════════════════════════════
  // POST /api/bounties/webhook
  // ════════════════════════════════════════════════════════════════════
  describe('POST /api/bounties/webhook', () => {
    it('creates a bounty when issue is opened with bounty label and valid amount', async () => {
      axios.post
        .mockResolvedValueOnce(makePaymentResponse())        // payment order
        .mockResolvedValueOnce({ data: {} });                // GitHub comment

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(makeIssuePayload())
        .expect(200);

      expect(res.text).toBe('OK');
      expect(MockBounty).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 101,
          repo: 'MyZubster-Ecosystem/MyZubsterGateway',
          amount: 0.05,
          contributor: 'contributor1',
          status: 'pending',
        })
      );
      expect(savedBounties.length).toBeGreaterThanOrEqual(1);
      // Payment order created
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments/create-order'),
        expect.objectContaining({ amount: 0.05, orderId: 'bounty_MyZubster-Ecosystem_MyZubsterGateway_101' }),
        expect.any(Object)
      );
      // GitHub comment posted
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.objectContaining({ body: expect.stringContaining('Bounty Created') }),
        expect.any(Object)
      );
    });

    it('returns 200 OK when issue has no bounty label', async () => {
      const payload = makeIssuePayload({
        issue: { labels: [{ name: 'bug' }] },
      });

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(payload)
        .expect(200);

      expect(res.text).toBe('OK');
      expect(MockBounty).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('returns 200 OK for non-issue events', async () => {
      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'pull_request')
        .send({ action: 'opened' })
        .expect(200);

      expect(res.text).toBe('OK');
      expect(MockBounty).not.toHaveBeenCalled();
    });

    it('returns 200 OK when issue action is not "opened"', async () => {
      const payload = makeIssuePayload({ action: 'closed' });

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(payload)
        .expect(200);

      expect(res.text).toBe('OK');
      expect(MockBounty).not.toHaveBeenCalled();
    });

    it('adds a comment when bounty amount is missing from body', async () => {
      axios.post.mockResolvedValueOnce({ data: {} }); // GitHub comment

      const payload = makeIssuePayload({
        issue: { body: 'Fix the login bug without any bounty amount.' },
      });

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(payload)
        .expect(200);

      expect(res.text).toBe('OK');
      expect(MockBounty).not.toHaveBeenCalled();
      // Should ask user to specify amount
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.objectContaining({
          body: expect.stringContaining('specify bounty amount'),
        }),
        expect.any(Object)
      );
    });

    it('handles case-insensitive bounty amount parsing', async () => {
      axios.post
        .mockResolvedValueOnce(makePaymentResponse())
        .mockResolvedValueOnce({ data: {} });

      const payload = makeIssuePayload({
        issue: { body: 'bounty: 1.5 xmr\nDo something.' },
      });

      await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(payload)
        .expect(200);

      expect(MockBounty).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1.5 })
      );
    });

    it('returns 500 when payment API fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('Payment service down'));

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(makeIssuePayload())
        .expect(500);

      expect(res.text).toBe('Error');
    });

    it('handles missing GITHUB_TOKEN gracefully (addComment skips)', async () => {
      delete process.env.GITHUB_TOKEN;

      axios.post.mockResolvedValueOnce(makePaymentResponse());

      const res = await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(makeIssuePayload())
        .expect(200);

      // Bounty should still be created even if comment fails
      expect(savedBounties.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty labels array', async () => {
      const payload = makeIssuePayload({
        issue: { labels: [] },
      });

      await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(payload)
        .expect(200);

      expect(MockBounty).not.toHaveBeenCalled();
    });

    it('creates correct orderId format from repo and issue number', async () => {
      axios.post
        .mockResolvedValueOnce(makePaymentResponse())
        .mockResolvedValueOnce({ data: {} });

      await request(app)
        .post('/api/bounties/webhook')
        .set('x-github-event', 'issues')
        .send(makeIssuePayload())
        .expect(200);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/payments/create-order'),
        expect.objectContaining({
          orderId: 'bounty_MyZubster-Ecosystem_MyZubsterGateway_101',
        }),
        expect.any(Object)
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // GET /api/bounties/status/:issueNumber
  // ════════════════════════════════════════════════════════════════════
  describe('GET /api/bounties/status/:issueNumber', () => {
    it('returns the bounty when found', async () => {
      const mockBounty = {
        issueNumber: 101,
        repo: 'MyZubster-Ecosystem/MyZubsterGateway',
        amount: 0.05,
        status: 'pending',
        contributor: 'contributor1',
      };
      MockBounty.findOne.mockResolvedValue(mockBounty);

      const res = await request(app)
        .get('/api/bounties/status/101')
        .expect(200);

      expect(res.body.issueNumber).toBe(101);
      expect(res.body.status).toBe('pending');
    });

    it('returns 404 when bounty not found', async () => {
      MockBounty.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/bounties/status/999')
        .expect(404);

      expect(res.body.error).toBe('Bounty not found');
    });

    it('returns 500 on database error', async () => {
      MockBounty.findOne.mockRejectedValue(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/bounties/status/101')
        .expect(500);

      expect(res.body.error).toBe('DB connection failed');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PUT /api/bounties/:issueNumber
  // ════════════════════════════════════════════════════════════════════
  describe('PUT /api/bounties/:issueNumber', () => {
    it('updates bounty status successfully', async () => {
      const updatedBounty = {
        issueNumber: 101,
        status: 'completed',
        txId: 'tx_abc123',
        paidAt: new Date(),
      };
      MockBounty.findOneAndUpdate.mockResolvedValue(updatedBounty);

      const res = await request(app)
        .put('/api/bounties/101')
        .send({ status: 'completed', txId: 'tx_abc123' })
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.txId).toBe('tx_abc123');
    });

    it('adds a comment when status is changed to "paid"', async () => {
      axios.post.mockResolvedValueOnce({ data: {} }); // GitHub comment

      const updatedBounty = {
        issueNumber: 101,
        repo: 'MyZubster-Ecosystem/MyZubsterGateway',
        amount: 0.05,
        status: 'paid',
        txId: 'tx_abc123',
        paidAt: new Date(),
      };
      MockBounty.findOneAndUpdate.mockResolvedValue(updatedBounty);

      await request(app)
        .put('/api/bounties/101')
        .send({ status: 'paid', txId: 'tx_abc123' })
        .expect(200);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.objectContaining({
          body: expect.stringContaining('Bounty Paid'),
        }),
        expect.any(Object)
      );
    });

    it('does not add comment when status is not "paid"', async () => {
      const updatedBounty = {
        issueNumber: 101,
        status: 'completed',
      };
      MockBounty.findOneAndUpdate.mockResolvedValue(updatedBounty);

      await request(app)
        .put('/api/bounties/101')
        .send({ status: 'completed' })
        .expect(200);

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('returns 404 when bounty not found', async () => {
      MockBounty.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/bounties/999')
        .send({ status: 'paid', txId: 'tx_abc123' })
        .expect(404);

      expect(res.body.error).toBe('Bounty not found');
    });

    it('returns 500 on database error', async () => {
      MockBounty.findOneAndUpdate.mockRejectedValue(new Error('DB timeout'));

      const res = await request(app)
        .put('/api/bounties/101')
        .send({ status: 'paid', txId: 'tx_abc123' })
        .expect(500);

      expect(res.body.error).toBe('DB timeout');
    });
  });
});
