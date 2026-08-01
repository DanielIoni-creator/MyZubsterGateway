### Description
The `chat_template` currently uses `message['content'] is none`, which will crash when the next `transformers` release ships (upstream PR #45422 strips `content=None` before rendering).

### Steps to Reproduce
```python
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("deepseek-ai/DeepSeek-V3-Base")
tok.apply_chat_template(
    [
        {"role": "user", "content": "What's the weather?"},
        {"role": "assistant", "tool_calls": [{
            "type": "function",
            "function": {"name": "get_weather", "arguments": "{\"city\":\"Paris\"}"},
        }]},
    ],
    tokenize=False,
)
# CRASHES: 'dict object' has no attribute 'content'
