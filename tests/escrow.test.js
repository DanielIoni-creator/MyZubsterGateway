const escrowService = require('../services/escrowService');
jest.mock('../models/EscrowOrder', () => {
  const MockModel = function(data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); };
  MockModel.findOne = jest.fn();
  MockModel.find = jest.fn(() => ({ sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) }));
  return MockModel;
});
const EscrowOrder = require('../models/EscrowOrder');

describe('EscrowService', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('should create a pending escrow order', async () => {
    const order = await escrowService.createOrder({ buyer:'b1', seller:'s1', amount:0.5 });
    expect(order.status).toBe('pending'); expect(order.buyer).toBe('b1');
  });
  it('should mark order as funded', async () => {
    EscrowOrder.findOne.mockResolvedValue({ orderId:'t1', status:'pending', save: jest.fn().mockResolvedValue(true) });
    const order = await escrowService.markFunded('t1', 'addr');
    expect(order.status).toBe('funded');
  });
  it('should throw if order not found', async () => {
    EscrowOrder.findOne.mockResolvedValue(null);
    await expect(escrowService.markFunded('x','a')).rejects.toThrow('Order not found');
  });
  it('should mark as completed', async () => {
    EscrowOrder.findOne.mockResolvedValue({ orderId:'t1', status:'funded', save: jest.fn().mockResolvedValue(true) });
    const order = await escrowService.markCompleted('t1');
    expect(order.status).toBe('completed');
  });
  it('should mark as disputed', async () => {
    EscrowOrder.findOne.mockResolvedValue({ orderId:'t1', status:'funded', metadata:{}, save: jest.fn().mockResolvedValue(true) });
    const order = await escrowService.markDisputed('t1', 'reason');
    expect(order.status).toBe('disputed');
  });
  it('should refund order', async () => {
    EscrowOrder.findOne.mockResolvedValue({ orderId:'t1', status:'disputed', metadata:{}, save: jest.fn().mockResolvedValue(true) });
    const order = await escrowService.refundOrder('t1', 'resolved');
    expect(order.status).toBe('refunded');
  });
});
