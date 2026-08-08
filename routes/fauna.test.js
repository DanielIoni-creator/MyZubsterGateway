const router = require('./fauna');

describe('MyZubster Fauna API Router', () => {
  it('should export express router instance', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
