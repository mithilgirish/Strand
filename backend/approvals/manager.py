# backend/approvals/manager.py — HITL Approval Gate per PRD §14.4 (v1.2)
"""
Per v1.2: HITL approval is DISTINCT from Judge verification.
- Judge checks truth (are the facts correct?)
- HITL checks action (should we send this RFI / create this NCR?)

Phase 1: in-memory queue
Phase 2: Redis-backed queue
DEMO_MODE: auto-approve cached-path writes
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from loguru import logger

from backend.config import settings
from backend.redis_client import redis_client
from backend.models.planner import ApprovalItem


class ApprovalManager:
    """Manages the HITL approval queue."""

    def __init__(self):
        self._memory_queue: dict[str, ApprovalItem] = {}

    def create_approval(
        self,
        action: str,
        payload: dict,
        agent: str,
    ) -> str:
        """
        Create a pending approval.

        Args:
            action: What's being approved (e.g., "send_rfi", "create_ncr")
            payload: The full data to be actioned
            agent: Which agent created this

        Returns:
            approval_id
        """
        approval_id = f"APPR-{uuid4().hex[:8].upper()}"

        item = ApprovalItem(
            approval_id=approval_id,
            action=action,
            agent=agent,
            payload=payload,
            status="pending",
            created_at=datetime.utcnow().isoformat() + "Z",
        )

        # DEMO_MODE: auto-approve
        if settings.DEMO_MODE:
            item.status = "approved"
            item.decided_at = datetime.utcnow().isoformat() + "Z"
            item.decision_reason = "Auto-approved (DEMO_MODE)"
            logger.info(f"HITL: auto-approved {approval_id} (DEMO_MODE)")

        # Store in Redis or memory
        self._store_approval(item)

        logger.info(f"HITL: created approval {approval_id} for {action} by {agent}")
        return approval_id

    def resolve_approval(
        self,
        approval_id: str,
        decision: str,
        reason: Optional[str] = None,
    ) -> ApprovalItem:
        """
        Resolve a pending approval.

        Args:
            approval_id: The approval to resolve
            decision: "approve" or "reject"
            reason: Optional human-provided reason

        Returns:
            Updated ApprovalItem
        """
        item = self._get_approval(approval_id)
        if not item:
            from backend.errors import StrandNotFoundError
            raise StrandNotFoundError(f"Approval {approval_id} not found")

        if item.status != "pending":
            from backend.errors import StrandValidationError
            raise StrandValidationError(f"Approval {approval_id} already resolved: {item.status}")

        item.status = "approved" if decision.lower() == "approve" else "rejected"
        item.decided_at = datetime.utcnow().isoformat() + "Z"
        item.decision_reason = reason

        self._store_approval(item)

        logger.info(f"HITL: {item.status} approval {approval_id}: {reason or 'no reason'}")

        # If approved, execute the action
        if item.status == "approved":
            self._execute_approved_action(item)

        return item

    def get_pending(self) -> list[ApprovalItem]:
        """Get all pending approvals."""
        items = self._get_all()
        return [i for i in items if i.status == "pending"]

    def get_approval(self, approval_id: str) -> Optional[ApprovalItem]:
        """Get a specific approval by ID."""
        return self._get_approval(approval_id)

    def _store_approval(self, item: ApprovalItem):
        """Store an approval item."""
        self._memory_queue[item.approval_id] = item
        redis_client.set_json(
            f"approval:{item.approval_id}",
            item.model_dump(),
            ttl=86400,  # 24 hours
        )

    def _get_approval(self, approval_id: str) -> Optional[ApprovalItem]:
        """Retrieve an approval item."""
        if approval_id in self._memory_queue:
            return self._memory_queue[approval_id]

        data = redis_client.get_json(f"approval:{approval_id}")
        if data:
            return ApprovalItem(**data)
        return None

    def _get_all(self) -> list[ApprovalItem]:
        """Get all approval items."""
        items = list(self._memory_queue.values())

        # Also check Redis
        keys = redis_client.keys("approval:APPR-*")
        for key in keys:
            data = redis_client.get_json(key)
            if data:
                item = ApprovalItem(**data)
                if item.approval_id not in self._memory_queue:
                    items.append(item)

        return items

    def _execute_approved_action(self, item: ApprovalItem):
        """Execute the action after approval."""
        if item.action == "create_ncr":
            ncr_id = item.payload.get("ncr_id")
            if ncr_id:
                from backend.graph.client import neo4j_client
                from backend.graph.queries import UPDATE_NCR_STATUS
                neo4j_client.execute_write(
                    UPDATE_NCR_STATUS,
                    {"ncr_id": ncr_id, "status": "open"},
                )
                logger.info(f"HITL: NCR {ncr_id} status → 'open' after approval")

        elif item.action == "send_rfi":
            logger.info(f"HITL: RFI approved for transmission (mock)")

        else:
            logger.info(f"HITL: approved action '{item.action}' — no auto-execution configured")


# ── Singleton ────────────────────────────────────────────────────────
approval_manager = ApprovalManager()
