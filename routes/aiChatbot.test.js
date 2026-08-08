const router = require('./aiChatbot');

describe('AI Support Chatbot Router', () => {
  it('should export Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
