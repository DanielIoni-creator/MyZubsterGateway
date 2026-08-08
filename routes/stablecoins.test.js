const router = require('./stablecoins');

describe('Stablecoin Payments Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
