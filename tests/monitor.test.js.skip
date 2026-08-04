const { checkPendingOrders } = require('../services/paymentMonitor');
const { Order } = require('../models');

// Mock di axios per le chiamate RPC
jest.mock('axios');
const axios = require('axios');

describe('Payment Monitor', () => {
  test('checkPendingOrders - nessun ordine in sospeso', async () => {
    jest.spyOn(Order, 'findAll').mockResolvedValue([]);
    await checkPendingOrders();
    expect(Order.findAll).toHaveBeenCalledWith({ where: { status: 'pending' } });
  });

  test('checkPendingOrders - rileva pagamento', async () => {
    const mockOrder = { 
      id: 1, 
      moneroAddress: '8B1v...', 
      moneroAmount: 0.006, 
      status: 'pending',
      save: jest.fn()
    };
    jest.spyOn(Order, 'findAll').mockResolvedValue([mockOrder]);
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        result: {
          payments: [{
            address: '8B1v...',
            amount: 6000000000,
            confirmations: 10,
            tx_hash: 'abc123'
          }]
        }
      }
    });

    await checkPendingOrders();
    expect(mockOrder.save).toHaveBeenCalled();
    expect(mockOrder.status).toBe('completed');
  });
});