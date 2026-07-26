#!/usr/bin/env python3
"""Fix chat_template crash when assistant message omits content key.

The DeepSeek-V3-Base tokenizer_config.json chat_template uses:
    message['content'] is none
    
This crashes when content key is completely absent from the message dict.
The fix replaces it with a safe access pattern: 
    message.get('content') is none

Usage:
    python fix_chat_template.py [path_to_tokenizer_config.json]
    
If no path is given, defaults to the DeepSeek-V3-Base config location.
"""
import json
import sys
import os
import shutil


def fix_chat_template(config_path: str) -> str | None:
    """Fix the chat_template in a tokenizer_config.json file.
    
    Returns the path to the backup of the original file.
    """
    if not os.path.exists(config_path):
        print(f"ERROR: {config_path} not found")
        sys.exit(1)

    # Create backup
    backup_path = config_path + ".backup"
    shutil.copy2(config_path, backup_path)

    with open(config_path, 'r') as f:
        config = json.load(f)

    chat_template = config.get('chat_template', '')
    if not chat_template:
        print("ERROR: No chat_template found in config")
        sys.exit(1)

    original = chat_template
    
    # Fix: Use .get() for safe access when content key might be absent
    # This prevents crashes when HuggingFace transformers strips content=None
    # before rendering the template (upstream PR #45422)
    
    # Fix 1: message['content'] is none → message.get('content') is none
    chat_template = chat_template.replace(
        "message['content'] is none",
        "message.get('content') is none"
    )
    
    # Fix 2: message['content'] is not none → message.get('content') is not none
    chat_template = chat_template.replace(
        "message['content'] is not none",
        "message.get('content') is not none"
    )
    
    # Fix 3: message['content'] → message.get('content', '')
    # Only replace direct access (not inside .get() calls)
    # This handles system/user message content, tool output content
    chat_template = chat_template.replace(
        "message['content']",
        "message.get('content', '')"
    )
    
    # Fix 4: message['content'] != '' → message.get('content', '') != ''
    # (already covered by Fix 3, but kept for clarity)
    chat_template = chat_template.replace(
        "message.get('content', '') != ''",
        "message.get('content', '') != ''"
    )
    
    # Fix 5: set content = message['content'] → set content = message.get('content', '')
    chat_template = chat_template.replace(
        "set content = message['content']",
        "set content = message.get('content', '')"
    )

    if chat_template == original:
        print("No changes needed - template already has safe access patterns")
        # Remove backup since nothing changed
        os.remove(backup_path)
        return None
    else:
        config['chat_template'] = chat_template
        
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Fixed chat_template in {config_path}")
        print(f"📦 Backup saved to {backup_path}")
        
        # Show diff summary
        orig_lines = original.split('\n')
        new_lines = chat_template.split('\n')
        changes = sum(1 for o, n in zip(orig_lines, new_lines) if o != n)
        print(f"🔧 {changes} lines changed")
        
        return backup_path


def main():
    config_path = ""
    if len(sys.argv) > 1:
        config_path = sys.argv[1]
    else:
        # Default location for DeepSeek-V3-Base in HuggingFace cache
        cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
        model_dir = os.path.join(cache_dir, "models--deepseek-ai--DeepSeek-V3-Base")
        if os.path.isdir(model_dir):
            # Find the latest snapshot
            snapshots = os.path.join(model_dir, "snapshots")
            if os.path.isdir(snapshots):
                snapshots_list = sorted(os.listdir(snapshots))
                if snapshots_list:
                    latest = snapshots_list[-1]
                    config_path = os.path.join(snapshots, latest, "tokenizer_config.json")
                    if not os.path.exists(config_path):
                        config_path = None
            
            if not config_path:
                # Try refs/main
                refs = os.path.join(model_dir, "refs", "main")
                if os.path.exists(refs):
                    with open(refs) as f:
                        snapshot = f.read().strip()
                    config_path = os.path.join(model_dir, "snapshots", snapshot, "tokenizer_config.json")
        
        if not config_path or not os.path.exists(config_path or ""):
            print("Usage: python fix_chat_template.py <path_to_tokenizer_config.json>")
            print("\nCould not auto-detect tokenizer_config.json location.")
            print("Please provide the path manually.")
            sys.exit(1)
    
    fix_chat_template(config_path or "")


if __name__ == "__main__":
    main()
