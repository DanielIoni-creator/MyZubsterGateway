const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const script = path.join(__dirname, '..', 'tools', 'fix_chat_template.py');

function writeTokenizerConfig(chatTemplate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myzubster-chat-template-'));
  const configPath = path.join(dir, 'tokenizer_config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ chat_template: chatTemplate, tokenizer_class: 'DeepSeekTokenizer' }, null, 2),
  );
  return configPath;
}

describe('fix_chat_template.py', () => {
  test('patches unsafe message content access and writes a backup', () => {
    const configPath = writeTokenizerConfig(
      [
        "{% if message['content'] is none %}",
        '{{ message["content"] }}',
        "{% elif message['content'] is not none %}",
        "{{ message['content'] }}",
      ].join('\n'),
    );

    execFileSync('python3', [script, configPath], { encoding: 'utf8' });

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.chat_template).toContain("message.get('content') is none");
    expect(config.chat_template).toContain("message.get('content') is not none");
    expect(config.chat_template).toContain("message.get('content', '')");
    expect(config.chat_template).not.toContain("message['content']");
    expect(config.chat_template).not.toContain('message["content"]');
    expect(fs.existsSync(`${configPath}.backup`)).toBe(true);
  });

  test('is idempotent after the first patch', () => {
    const configPath = writeTokenizerConfig("{{ message['content'] }}");

    execFileSync('python3', [script, configPath], { encoding: 'utf8' });
    const first = fs.readFileSync(configPath, 'utf8');
    const backup = fs.readFileSync(`${configPath}.backup`, 'utf8');

    execFileSync('python3', [script, configPath], { encoding: 'utf8' });

    expect(fs.readFileSync(configPath, 'utf8')).toBe(first);
    expect(fs.readFileSync(`${configPath}.backup`, 'utf8')).toBe(backup);
  });

  test('rejects tokenizer configs without a chat_template string', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myzubster-chat-template-'));
    const configPath = path.join(dir, 'tokenizer_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ tokenizer_class: 'DeepSeekTokenizer' }));

    const result = spawnSync('python3', [script, configPath], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('does not contain a string chat_template');
  });
});
