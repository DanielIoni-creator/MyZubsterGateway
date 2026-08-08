const router = require('./fiat');

describe('Fiat USD/EUR/GBP Payment Gateway Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
