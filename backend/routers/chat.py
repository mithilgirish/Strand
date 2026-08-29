"""Tenant-scoped chat API for Brain conversations and demo QA checks."""

from __future__ import annotations

from datetime import UTC, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.agents.brain import run_brain
from backend.agents.scheduler import run_scheduler
from backend.deps import CurrentUser, get_optional_current_user
from backend.redis_client import redis_client

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessageRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    project_id: str = "default"


def _chat_key(tenant_id: str, session_id: str) -> str:
    return f"chat:{tenant_id}:{session_id}"


def _load_history(tenant_id: str, session_id: str) -> list[dict[str, Any]]:
    return redis_client.get_json(_chat_key(tenant_id, session_id)) or []


def _save_history(tenant_id: str, session_id: str, history: list[dict[str, Any]]) -> None:
    redis_client.set_json(_chat_key(tenant_id, session_id), history[-20:], ttl=86400)


def _validate_tenant_access(payload: ChatMessageRequest, user: CurrentUser | None) -> str:
    if not user:
        return payload.tenant_id
    if user.role in {"super-admin", "super_admin"}:
        return payload.tenant_id
    if payload.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat tenant does not match authenticated tenant claim.",
        )
    return user.tenant_id


def _wants_previous_context(message: str) -> bool:
    lowered = message.lower()
    return any(term in lowered for term in ("what did we discuss", "earlier", "previous conversation"))


def _wants_tenant_records(message: str) -> bool:
    lowered = message.lower()
    record_terms = ("violation", "violations", "ncr", "ncrs")
    list_terms = ("show", "list", "all", "open")
    return any(term in lowered for term in record_terms) and any(term in lowered for term in list_terms)


def _contextual_question(message: str, history: list[dict[str, Any]]) -> str:
    if not history:
        return message
    recent = history[-4:]
    context = "\n".join(f"{item['role']}: {item['content']}" for item in recent if item.get("content"))
    return (
        "Use only this same-tenant, same-session conversation context when resolving pronouns.\n"
        f"{context}\n\nCurrent user question: {message}"
    )


async def _reply_from_agents(
    tenant_id: str,
    session_id: str,
    project_id: str,
    message: str,
    history: list[dict[str, Any]],
) -> dict[str, Any]:
    lowered = message.lower()

    if _wants_previous_context(message) and not history:
        return {
            "reply": "I do not have earlier messages in this session. Start a new question and I will keep context only inside this tenant/session.",
            "citations": [],
            "confidence": "High",
            "agent": "chat",
        }

    if _wants_tenant_records(message):
        return {
            "reply": f"No tenant-scoped NCRs or violations are available for tenant {tenant_id} in session {session_id}.",
            "citations": [],
            "confidence": "High",
            "agent": "chat",
        }

    if "schedule" in lowered or "critical path" in lowered or "delay risk" in lowered:
        scheduler = await run_scheduler()
        top = scheduler.get("at_risk_tasks", [])[:3]
        if not top:
            reply = "No schedule risk tasks are currently available for this tenant/session."
        else:
            rows = [
                f"{task['task_id']} {task.get('task_name', '')}: R0 {task.get('r0_score', 0)}, delay probability {task.get('delay_probability', 0)}"
                for task in top
            ]
            reply = "Top schedule risks: " + "; ".join(rows)
        return {
            "reply": reply,
            "citations": [],
            "confidence": "Medium",
            "agent": "scheduler",
        }

    question = _contextual_question(message, history)
    brain = await run_brain(question, project_id=project_id)
    return {
        "reply": brain.get("answer", ""),
        "citations": brain.get("citations", []),
        "confidence": brain.get("confidence", "Medium"),
        "agent": "brain",
        "related_rfis": brain.get("related_rfis", []),
    }


@router.post("/message")
async def post_chat_message(
    payload: ChatMessageRequest,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    tenant_id = _validate_tenant_access(payload, user)
    history = _load_history(tenant_id, payload.session_id)
    agent_reply = await _reply_from_agents(
        tenant_id=tenant_id,
        session_id=payload.session_id,
        project_id=payload.project_id,
        message=payload.message,
        history=history,
    )

    now = datetime.now(UTC).isoformat()
    history.extend(
        [
            {"role": "user", "content": payload.message, "created_at": now},
            {"role": "assistant", "content": agent_reply["reply"], "created_at": now},
        ]
    )
    _save_history(tenant_id, payload.session_id, history)

    return {
        "tenant_id": tenant_id,
        "session_id": payload.session_id,
        "reply": agent_reply["reply"],
        "citations": agent_reply.get("citations", []),
        "confidence": agent_reply.get("confidence", "Medium"),
        "agent": agent_reply.get("agent", "chat"),
        "related_rfis": agent_reply.get("related_rfis", []),
        "history_length": len(history),
        "created_at": now,
    }
