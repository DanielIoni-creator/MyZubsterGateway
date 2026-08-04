jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('../models/MoneroTransaction', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}));

const axios = require('axios');
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const moneroService = require('../services/moneroService');

describe('MoneroService.verifyTransaction', () => {
  const txid = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
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
