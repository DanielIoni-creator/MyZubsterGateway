#!/usr/bin/env python3
"""Patch DeepSeek chat templates that assume every message has content."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


MODEL_CACHE_NAME = "models--deepseek-ai--DeepSeek-V3-Base"


def patch_template(template: str) -> tuple[str, int]:
    patched = template
    replacements = (
        ("message['content'] is not none", "message.get('content') is not none"),
        ('message["content"] is not none', "message.get('content') is not none"),
        ("message['content'] is none", "message.get('content') is none"),
        ('message["content"] is none', "message.get('content') is none"),
        ("message['content']", "message.get('content', '')"),
        ('message["content"]', "message.get('content', '')"),
    )

    changed = 0
    for before, after in replacements:
        count = patched.count(before)
        if count:
            patched = patched.replace(before, after)
            changed += count

    return patched, changed


def default_huggingface_cache() -> Path:
    if os.environ.get("HF_HOME"):
        return Path(os.environ["HF_HOME"]).expanduser() / "hub"
    if os.environ.get("HUGGINGFACE_HUB_CACHE"):
        return Path(os.environ["HUGGINGFACE_HUB_CACHE"]).expanduser()
    return Path.home() / ".cache" / "huggingface" / "hub"


def find_tokenizer_config() -> Path:
    model_cache = default_huggingface_cache() / MODEL_CACHE_NAME
    candidates = sorted(model_cache.glob("snapshots/*/tokenizer_config.json"))
    if not candidates:
        raise FileNotFoundError(
            "Could not find DeepSeek-V3-Base tokenizer_config.json in the Hugging Face cache. "
            "Pass the file path explicitly."
        )
    return candidates[-1]


def patch_config(path: Path) -> int:
    config_path = path.expanduser().resolve()
    data = json.loads(config_path.read_text(encoding="utf-8"))
    template = data.get("chat_template")
    if not isinstance(template, str):
        raise ValueError(f"{config_path} does not contain a string chat_template field")

    patched_template, changed = patch_template(template)
    if changed == 0:
        print(f"No unsafe message['content'] access found in {config_path}")
        return 0

    backup_path = config_path.with_suffix(config_path.suffix + ".backup")
    if not backup_path.exists():
        backup_path.write_text(
            config_path.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    data["chat_template"] = patched_template
    config_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Patched {changed} unsafe access pattern(s) in {config_path}")
    print(f"Backup: {backup_path}")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Patch DeepSeek-V3 tokenizer_config.json chat_template content access."
    )
    parser.add_argument(
        "tokenizer_config",
        nargs="?",
        type=Path,
        help="Path to tokenizer_config.json. Defaults to the Hugging Face DeepSeek-V3-Base cache.",
    )
    args = parser.parse_args()

    path = args.tokenizer_config or find_tokenizer_config()
    patch_config(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
