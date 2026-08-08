const router = require('./portfolioOpt');

describe('AI Portfolio Optimization Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
