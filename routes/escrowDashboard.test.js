const router = require('./escrowDashboard');

describe('Escrow Management Dashboard Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
