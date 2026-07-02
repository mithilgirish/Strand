# backend/prompts/registry.py — YAML-based prompt loader per PRD §5.9 (v1.2)
"""
All prompts are externalized to YAML files, one per prompt.
Agents call load_prompt() instead of embedding f-strings.
invoke_structured() logs which prompt name+version was used.
"""
from __future__ import annotations

import os
from typing import Optional
from pathlib import Path

from loguru import logger

# ── Prompt cache ─────────────────────────────────────────────────────
_prompt_cache: dict[str, dict] = {}

PROMPTS_DIR = Path(__file__).parent


def load_prompt(name: str, version: Optional[int] = None, **variables) -> str:
    """
    Load and render a prompt from the YAML registry.

    Args:
        name: Prompt file name (without .yaml extension)
        version: Pin to a specific version (None = latest)
        **variables: Template variables to substitute

    Returns:
        Rendered prompt string
    """
    cache_key = f"{name}::{version or 'latest'}"

    if cache_key not in _prompt_cache:
        _prompt_cache[cache_key] = _load_yaml(name)

    prompt_data = _prompt_cache[cache_key]

    if version and prompt_data.get("version") != version:
        logger.warning(
            f"Prompt '{name}' version mismatch: "
            f"requested {version}, got {prompt_data.get('version')}"
        )

    template = prompt_data.get("template", "")

    # Substitute variables
    try:
        rendered = template.format(**variables)
    except KeyError as e:
        logger.warning(f"Missing prompt variable {e} in '{name}', using template as-is")
        rendered = template

    return rendered


def get_prompt_version(name: str) -> int:
    """Get the current version of a prompt."""
    data = _load_yaml(name)
    return data.get("version", 1)


def _load_yaml(name: str) -> dict:
    """Load a YAML prompt file."""
    yaml_path = PROMPTS_DIR / f"{name}.yaml"

    if not yaml_path.exists():
        logger.warning(f"Prompt file not found: {yaml_path}")
        return {"version": 1, "template": "", "variables": []}

    try:
        import yaml
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data or {}
    except ImportError:
        # Fall back to simple parsing if PyYAML not available
        return _simple_yaml_parse(yaml_path)
    except Exception as e:
        logger.error(f"Failed to load prompt '{name}': {e}")
        return {"version": 1, "template": "", "variables": []}


def _simple_yaml_parse(path: Path) -> dict:
    """Simple YAML parser fallback when PyYAML is not installed."""
    data = {"version": 1, "template": "", "variables": []}
    in_template = False
    template_lines = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("version:"):
                try:
                    data["version"] = int(line.split(":")[1].strip())
                except ValueError:
                    pass
            elif line.startswith("template:"):
                in_template = True
                # Check for inline template
                rest = line.split(":", 1)[1].strip()
                if rest.startswith("|"):
                    continue
                elif rest:
                    data["template"] = rest
                    in_template = False
            elif line.startswith("variables:"):
                in_template = False
                data["template"] = "\n".join(template_lines)
            elif in_template:
                # Remove 2-space YAML indentation
                if line.startswith("  "):
                    template_lines.append(line[2:].rstrip())
                else:
                    template_lines.append(line.rstrip())

    if template_lines and not data["template"]:
        data["template"] = "\n".join(template_lines)

    return data
