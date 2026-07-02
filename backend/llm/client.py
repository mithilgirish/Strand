# backend/llm/client.py — Shared LLM client wrapper per PRD §5.2
"""
All agents use invoke_structured() for reliable Pydantic JSON parsing.
- Supports Groq (dev) and Anthropic (demo)
- 3x retry with exponential backoff on parse failures
- Logs prompt_name, prompt_version, latency, token counts per call
- Returns typed Pydantic models, not raw strings
"""
from __future__ import annotations

import json
import time
from typing import Type, TypeVar, Optional

from loguru import logger
from pydantic import BaseModel

from backend.config import settings
from backend.errors import StrandLLMError, StrandLLMParseError

T = TypeVar("T", bound=BaseModel)


# ── Metrics accumulator (§14.6 observability) ────────────────────────
_agent_metrics: dict[str, dict] = {}


def get_agent_metrics(agent_name: str) -> dict:
    """Return accumulated metrics for an agent. Used by /metrics endpoint."""
    return _agent_metrics.get(agent_name, {
        "total_calls": 0,
        "total_tokens": 0,
        "total_latency_ms": 0,
        "retry_count": 0,
        "error_count": 0,
    })


def _record_metric(agent_name: str, latency_ms: float, tokens: int, retried: bool, errored: bool):
    if agent_name not in _agent_metrics:
        _agent_metrics[agent_name] = {
            "total_calls": 0,
            "total_tokens": 0,
            "total_latency_ms": 0,
            "retry_count": 0,
            "error_count": 0,
        }
    m = _agent_metrics[agent_name]
    m["total_calls"] += 1
    m["total_tokens"] += tokens
    m["total_latency_ms"] += latency_ms
    if retried:
        m["retry_count"] += 1
    if errored:
        m["error_count"] += 1


# ── LLM Client Factory ──────────────────────────────────────────────
def _get_llm():
    """Instantiate the correct LLM based on LLM_PROVIDER setting."""
    provider = settings.LLM_PROVIDER.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.LLM_MODEL,
            api_key=settings.ANTHROPIC_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
    else:
        raise StrandLLMError(f"Unknown LLM_PROVIDER: {provider}")


# Cached LLM instance
_llm_instance = None


def get_llm():
    """Return a cached LLM instance."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = _get_llm()
    return _llm_instance


def reset_llm():
    """Reset cached LLM (used when switching providers)."""
    global _llm_instance
    _llm_instance = None


# ── Core invoke_structured ──────────────────────────────────────────
def invoke_structured(
    prompt: str,
    response_model: Type[T],
    agent_name: str = "unknown",
    prompt_name: str = "unknown",
    prompt_version: int = 1,
    max_retries: Optional[int] = None,
) -> T:
    """
    Invoke the LLM and parse the response into a Pydantic model.

    Per PRD §5.2:
    - Retries up to LLM_RETRY_COUNT times on parse failures
    - Exponential backoff between retries
    - Logs prompt_name, prompt_version, latency, token counts
    - Returns a validated Pydantic model instance

    Args:
        prompt: The full prompt string to send to the LLM
        response_model: Pydantic model class to parse the response into
        agent_name: Name of the calling agent (for metrics/logging)
        prompt_name: Registry name of the prompt (§5.9)
        prompt_version: Version of the prompt
        max_retries: Override default retry count

    Returns:
        Parsed Pydantic model instance

    Raises:
        StrandLLMError: If LLM invocation fails after all retries
        StrandLLMParseError: If response cannot be parsed after all retries
    """
    from langchain_core.messages import HumanMessage

    retries = max_retries if max_retries is not None else settings.LLM_RETRY_COUNT
    llm = get_llm()
    last_error = None
    had_retry = False

    for attempt in range(retries + 1):
        start = time.time()
        try:
            # Invoke LLM
            response = llm.invoke([HumanMessage(content=prompt)])
            latency_ms = (time.time() - start) * 1000

            # Extract token usage if available
            tokens = 0
            if hasattr(response, "response_metadata"):
                usage = response.response_metadata.get("token_usage", {})
                tokens = usage.get("total_tokens", 0)

            raw_content = response.content

            # Log the call
            logger.info(
                "LLM call completed",
                agent=agent_name,
                prompt_name=prompt_name,
                prompt_version=prompt_version,
                latency_ms=round(latency_ms, 1),
                tokens=tokens,
                attempt=attempt + 1,
            )

            # Parse JSON from response
            parsed = _extract_json(raw_content)
            result = response_model.model_validate(parsed)

            _record_metric(agent_name, latency_ms, tokens, had_retry, False)
            return result

        except (json.JSONDecodeError, ValueError, Exception) as e:
            latency_ms = (time.time() - start) * 1000
            last_error = e
            had_retry = True

            logger.warning(
                f"LLM parse attempt {attempt + 1}/{retries + 1} failed: {e}",
                agent=agent_name,
                prompt_name=prompt_name,
            )

            if attempt < retries:
                # Exponential backoff: 1s, 2s, 4s
                backoff = 2 ** attempt
                time.sleep(backoff)
            continue

    _record_metric(agent_name, 0, 0, True, True)
    raise StrandLLMParseError(
        message=f"Failed to parse LLM response after {retries + 1} attempts: {last_error}",
        agent=agent_name,
    )


# ── Raw invoke (for non-structured use cases) ────────────────────────
def invoke_raw(
    prompt: str,
    agent_name: str = "unknown",
    prompt_name: str = "unknown",
    prompt_version: int = 1,
) -> str:
    """
    Invoke the LLM and return raw text response.
    Used for free-form text generation (RFI drafts, mitigations).
    """
    from langchain_core.messages import HumanMessage

    llm = get_llm()
    start = time.time()

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        latency_ms = (time.time() - start) * 1000

        tokens = 0
        if hasattr(response, "response_metadata"):
            usage = response.response_metadata.get("token_usage", {})
            tokens = usage.get("total_tokens", 0)

        logger.info(
            "LLM raw call completed",
            agent=agent_name,
            prompt_name=prompt_name,
            prompt_version=prompt_version,
            latency_ms=round(latency_ms, 1),
            tokens=tokens,
        )

        _record_metric(agent_name, latency_ms, tokens, False, False)
        return response.content

    except Exception as e:
        latency_ms = (time.time() - start) * 1000
        _record_metric(agent_name, latency_ms, 0, False, True)
        raise StrandLLMError(
            message=f"LLM invocation failed: {e}",
            agent=agent_name,
        )


# ── JSON extraction helpers ──────────────────────────────────────────
def _extract_json(text: str) -> dict:
    """
    Extract JSON from LLM response text.
    Handles common patterns: raw JSON, ```json fenced, mixed text+JSON.
    """
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fence
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        return json.loads(text[start:end].strip())

    if "```" in text:
        start = text.index("```") + 3
        end = text.index("```", start)
        candidate = text[start:end].strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Try finding JSON object boundaries
    brace_start = text.find("{")
    if brace_start != -1:
        # Find matching closing brace
        depth = 0
        for i in range(brace_start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(text[brace_start:i + 1])

    # Try finding JSON array boundaries
    bracket_start = text.find("[")
    if bracket_start != -1:
        depth = 0
        for i in range(bracket_start, len(text)):
            if text[i] == "[":
                depth += 1
            elif text[i] == "]":
                depth -= 1
                if depth == 0:
                    return json.loads(text[bracket_start:i + 1])

    raise json.JSONDecodeError("No valid JSON found in LLM response", text, 0)
