const router = require('./aiMonitoring');

describe('Real-Time AI Monitoring Agent Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
