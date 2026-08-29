"""
Human-in-the-loop (HITL) approval gate and queue manager.
- Judge agent verifies compliance and factual truth.
- HITL gate arbitrates high-impact write operations (RFI dispatch, schedule alterations).
- Supports Redis-backed persistent queues with in-memory fallback.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from loguru import logger

from backend.config import settings
from backend.models.planner import ApprovalItem
from backend.redis_client import redis_client


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
            self._execute_approved_action(item)

        # Store in Redis or memory
        self._store_approval(item)

        logger.info(f"HITL: created approval {approval_id} for {action} by {agent}")
        return approval_id

    def resolve_approval(
        self,
        approval_id: str,
        decision: str,
        reason: str | None = None,
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
        # Concurrency guard
        lock_key = f"lock:approval:{approval_id}"
        if not redis_client.acquire_lock(lock_key):
            from backend.errors import StrandValidationError

            raise StrandValidationError(f"Approval {approval_id} is currently being resolved")

        try:
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

            # If approved, execute the action (can throw, preventing storage)
            if item.status == "approved":
                self._execute_approved_action(item)

            self._store_approval(item)

            logger.info(f"HITL: {item.status} approval {approval_id}: {reason or 'no reason'}")

            return item
        finally:
            redis_client.release_lock(lock_key)

    def get_pending(self) -> list[ApprovalItem]:
        """Get all pending approvals."""
        items = self._get_all()
        return [i for i in items if i.status == "pending"]

    def get_approval(self, approval_id: str) -> ApprovalItem | None:
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

    def _get_approval(self, approval_id: str) -> ApprovalItem | None:
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
        seen = {item.approval_id for item in items}

        for key in redis_client.keys("approval:APPR-*"):
            data = redis_client.get_json(key.decode("utf-8") if isinstance(key, bytes) else key)
            if data:
                item = ApprovalItem(**data)
                if item.approval_id not in seen:
                    items.append(item)
                    seen.add(item.approval_id)

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
            logger.info("HITL: RFI approved for transmission (mock)")

        else:
            logger.info(f"HITL: approved action '{item.action}' — no auto-execution configured")


# ── Singleton ────────────────────────────────────────────────────────
approval_manager = ApprovalManager()
