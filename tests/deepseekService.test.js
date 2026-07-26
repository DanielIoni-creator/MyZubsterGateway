const axios = require('axios');
const { askDeepSeek } = require('../services/deepseekService');

jest.mock('axios');

describe('askDeepSeek content extraction', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns content when present', async () => {
    axios.post.mockResolvedValue({ data: { message: { content: 'hello' } } });
    const res = await askDeepSeek('hi');
    expect(res).toBe('hello');
  });

  test('throws clear error when message.content is missing', async () => {
    axios.post.mockResolvedValue({ data: { message: { role: 'assistant' } } });
    await expect(askDeepSeek('hi')).rejects.toThrow(/missing content/);
  });

  test('throws clear error when message.content is null', async () => {
    axios.post.mockResolvedValue({ data: { message: { content: null } } });
    await expect(askDeepSeek('hi')).rejects.toThrow(/missing content/);
  });

  test('throws informative error on tool-call response without content', async () => {
    axios.post.mockResolvedValue({
      data: { message: { role: 'assistant', tool_calls: [{ type: 'function' }] } },
    });
    await expect(askDeepSeek('hi')).rejects.toThrow(/tool_calls/);
  });

  test('throws when message is absent entirely', async () => {
    axios.post.mockResolvedValue({ data: {} });
    await expect(askDeepSeek('hi')).rejects.toThrow(/missing content/);
  });
});
