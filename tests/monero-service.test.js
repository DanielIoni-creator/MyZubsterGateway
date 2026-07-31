jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('../models/MoneroTransaction', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}));

const axios = require('axios');
const MoneroTransaction = require('../models/MoneroTransaction');
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const moneroService = require('../services/moneroService');

describe('MoneroService.verifyTransaction', () => {
  const txid = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS;
    delete process.env.MONERO_REQUIRED_CONFIRMATIONS;
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('reads a saved marketplace transaction hash from the wallet RPC', async () => {
    axios.post.mockResolvedValue({
      data: {
        result: {
          transfer: {
            txid,
            type: 'in',
            amount: 750000000000,
            confirmations: 12,
            in_pool: false,
          },
        },
      },
    });

    const result = await moneroService.verifyTransaction({
      transactionHash: txid,
      amount: 0.75,
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        jsonrpc: '2.0',
        id: '0',
        method: 'get_transfer_by_txid',
        params: { txid, account_index: 0 },
      }
    );
    expect(result).toEqual({
      status: 'confirmed',
      txHash: txid,
      confirmations: 12,
      amount: 0.75,
      protocol: 'ringct',
      isFcmpPlusPlus: false,
      requiredConfirmations: 10,
      inPool: false,
      unlockTime: 0,
    });
  });

  it('keeps a pool transaction pending', async () => {
    axios.post.mockResolvedValue({
      data: {
        result: {
          transfer: {
            txid,
            type: 'pool',
            amount: 100000000000,
            confirmations: 0,
            in_pool: true,
          },
        },
      },
    });

    const result = await moneroService.verifyTransaction({
      transactionHash: txid,
      amount: 0.1,
    });

    expect(result.status).toBe('pending');
    expect(result.confirmations).toBe(0);
    expect(result.reason).toBe('in_pool');
  });

  it('does not confirm an underpaid transfer', async () => {
    axios.post.mockResolvedValue({
      data: {
        result: {
          transfer: {
            txid,
            type: 'in',
            amount: 50000000000,
            confirmations: 20,
            in_pool: false,
          },
        },
      },
    });

    const result = await moneroService.verifyTransaction({
      transactionHash: txid,
      amount: 0.1,
    });

    expect(result.status).toBe('pending');
    expect(result.reason).toBe('underpaid');
    expect(result.amount).toBe(0.05);
  });

  it('tracks FCMP++ transfers until the configured confirmation target is met', async () => {
    process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS = '20';
    axios.post.mockResolvedValue({
      data: {
        result: {
          transfer: {
            txid,
            type: 'in',
            amount: 100000000000,
            confirmations: 12,
            protocol: 'fcmp++',
            in_pool: false,
          },
        },
      },
    });

    const result = await moneroService.verifyTransaction({
      transactionHash: txid,
      amount: 0.1,
    });

    expect(result).toMatchObject({
      status: 'pending',
      protocol: 'fcmp++',
      isFcmpPlusPlus: true,
      requiredConfirmations: 20,
      reason: 'insufficient_confirmations',
    });
  });

  it('marks failed or double-spend-seen wallet results as failed', async () => {
    axios.post.mockResolvedValue({
      data: {
        result: {
          transfer: {
            txid,
            type: 'failed',
            amount: 100000000000,
            confirmations: 0,
            double_spend_seen: true,
          },
        },
      },
    });

    const result = await moneroService.verifyTransaction({
      transactionHash: txid,
      amount: 0.1,
    });

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'double_spend_seen',
      txHash: txid,
    });
  });

  it('fails closed without a valid transaction hash', async () => {
    const result = await moneroService.verifyTransaction({
      paymentId: 'mock-payment',
      amount: 0.1,
    });

    expect(result.status).toBe('error');
    expect(result.error).toMatch(/transaction hash valido/);
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('MoneroService.checkPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS;
    delete process.env.MONERO_REQUIRED_CONFIRMATIONS;
  });

  it('persists FCMP++ monitoring fields on matching subaddress payments', async () => {
    process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS = '15';
    MoneroTransaction.findById.mockResolvedValue({
      _id: 'transaction-id',
      subaddress: '86WALLET',
      amount: 0.25,
    });
    MoneroTransaction.findByIdAndUpdate.mockResolvedValue({});
    axios.post.mockResolvedValue({
      data: {
        result: {
          in: [{
            address: '86WALLET',
            txid: 'b'.repeat(64),
            type: 'in',
            amount: 250000000000,
            confirmations: 15,
            proof_type: 'fcmp++',
            unlock_time: 0,
          }],
        },
      },
    });

    const result = await moneroService.checkPayment('transaction-id');

    expect(result).toMatchObject({
      status: 'confirmed',
      protocol: 'fcmp++',
      isFcmpPlusPlus: true,
      requiredConfirmations: 15,
    });
    expect(MoneroTransaction.findByIdAndUpdate).toHaveBeenCalledWith(
      'transaction-id',
      expect.objectContaining({
        status: 'confirmed',
        protocol: 'fcmp++',
        isFcmpPlusPlus: true,
        confirmationTarget: 15,
      })
    );
  });
});

describe('MoneroService.getWalletCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONERO_FCMP_PLUS_PLUS_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.MONERO_FCMP_PLUS_PLUS_ENABLED;
  });

  it('reports FCMP++ readiness from wallet RPC metadata', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { result: { version: 196621 } } })
      .mockResolvedValueOnce({ data: { result: { height: 3210000 } } });

    const capabilities = await moneroService.getWalletCapabilities();

    expect(capabilities).toMatchObject({
      version: 196621,
      height: 3210000,
      fcmpPlusPlusConfigured: true,
      supportedTransactionProtocols: ['ringct', 'fcmp++'],
    });
  });
});
