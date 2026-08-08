const router = require('./crypto');

describe('Crypto BTC/ETH/ADA Payments Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
