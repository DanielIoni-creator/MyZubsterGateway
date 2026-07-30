const { EscrowGateway, ORDER_STATES } = require('./escrow-gateway');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('EscrowGateway', () => {
  let gw, store;

  beforeEach(() => {
    store = path.join(os.tmpdir(), 'escrow-test-' + Date.now() + '.json');
    gw = new EscrowGateway({ storePath: store });
  });

  afterEach(() => { try { fs.unlinkSync(store); } catch (e) {} });

  it('creates order with valid params', () => {
    const o = gw.createOrder({ buyerId: 'b1', sellerId: 's1', amount: 1.5, itemId: 'abc' });
    expect(o.orderId).toBeDefined();
    expect(o.state).toBe(ORDER_STATES.PENDING);
    expect(o.history).toHaveLength(1);
  });

  it('rejects missing/zero/negative amount', () => {
    expect(() => gw.createOrder({ buyerId: 'b1', sellerId: 's1' })).toThrow();
    expect(() => gw.createOrder({ buyerId: 'b1', sellerId: 's1', amount: 0 })).toThrow();
    expect(() => gw.createOrder({ buyerId: 'b1', sellerId: 's1', amount: -5 })).toThrow();
  });

  it('generates unique IDs', () => {
    const a = gw.createOrder({ buyerId: 'x', sellerId: 'y', amount: 1 });
    const b = gw.createOrder({ buyerId: 'x', sellerId: 'y', amount: 2 });
    expect(a.orderId).not.toBe(b.orderId);
  });

  it('persists', () => {
    gw.createOrder({ buyerId: 'p1', sellerId: 'p2', amount: 3 });
    const g2 = new EscrowGateway({ storePath: store });
    expect(g2.listOrders()).toHaveLength(1);
  });

  it('lifecycle: pend -> fund -> complete', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 2 });
    const f = gw.fundOrder(o.orderId, 'tx-1', 'addr-1');
    expect(f.state).toBe(ORDER_STATES.FUNDED);
    const c = gw.completeOrder(o.orderId, { ok: true });
    expect(c.state).toBe(ORDER_STATES.COMPLETED);
    expect(c.aiVerification).toEqual({ ok: true });
  });

  it('prevents double-fund', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 1 });
    gw.fundOrder(o.orderId, 'tx-1', 'addr');
    expect(() => gw.fundOrder(o.orderId, 'tx-2', 'addr2')).toThrow();
  });

  it('prevents complete without fund', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 1 });
    expect(() => gw.completeOrder(o.orderId)).toThrow();
  });

  it('dispute and resolve', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 1 });
    gw.fundOrder(o.orderId, 'tx-1', 'addr');
    gw.raiseDispute(o.orderId, 'Wrong item', 'buyer');
    const r = gw.resolveDispute(o.orderId, 'refund', { reason: 'legit' });
    expect(r.state).toBe(ORDER_STATES.REFUNDED);
  });

  it('cancel pending order', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 1 });
    const c = gw.cancelOrder(o.orderId);
    expect(c.state).toBe(ORDER_STATES.CANCELLED);
  });

  it('cannot cancel funded order', () => {
    const o = gw.createOrder({ buyerId: 'b', sellerId: 's', amount: 1 });
    gw.fundOrder(o.orderId, 'tx-1', 'addr');
    expect(() => gw.cancelOrder(o.orderId)).toThrow();
  });

  it('list filters', () => {
    gw.createOrder({ buyerId: 'b1', sellerId: 's1', amount: 1 });
    gw.createOrder({ buyerId: 'b2', sellerId: 's1', amount: 2 });
    gw.createOrder({ buyerId: 'b1', sellerId: 's2', amount: 3 });
    expect(gw.listOrders({ buyerId: 'b1' })).toHaveLength(2);
    expect(gw.listOrders({ sellerId: 's2' })).toHaveLength(1);
    expect(gw.listOrders({ state: ORDER_STATES.PENDING })).toHaveLength(3);
  });

  it('getOrder throws on missing', () => {
    expect(() => gw.getOrder('nope')).toThrow('Order not found');
  });

  it('all ORDER_STATES defined', () => {
    const keys = ['PENDING', 'FUNDED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'CANCELLED'];
    keys.forEach(k => expect(ORDER_STATES[k]).toBeDefined());
  });
});
