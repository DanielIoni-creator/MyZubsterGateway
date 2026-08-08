const router = require('./subscriptions');

describe('Recurring Subscriptions Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
