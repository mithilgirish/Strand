import unittest
from unittest.mock import patch

from backend.approvals.manager import ApprovalManager
from backend.errors import StrandNotFoundError, StrandValidationError


class ApprovalManagerTests(unittest.TestCase):
    def setUp(self):
        self.mgr = ApprovalManager()

    def test_create_and_get_pending_approval(self):
        with patch("backend.config.settings.DEMO_MODE", False):
            appr_id = self.mgr.create_approval(
                action="send_rfi",
                payload={"rfi_id": "RFI-101", "subject": "Cooling Spec"},
                agent="guardian",
            )
            self.assertTrue(appr_id.startswith("APPR-"))
            item = self.mgr.get_approval(appr_id)
            self.assertIsNotNone(item)
            self.assertEqual(item.status, "pending")
            self.assertEqual(item.action, "send_rfi")
            self.assertEqual(item.agent, "guardian")

    def test_approve_workflow(self):
        with patch("backend.config.settings.DEMO_MODE", False):
            appr_id = self.mgr.create_approval(
                action="send_rfi",
                payload={"rfi_id": "RFI-102"},
                agent="guardian",
            )
            resolved = self.mgr.resolve_approval(appr_id, decision="approve", reason="Valid deviation")
            self.assertEqual(resolved.status, "approved")
            self.assertEqual(resolved.decision_reason, "Valid deviation")
            self.assertIsNotNone(resolved.decided_at)

    def test_reject_workflow(self):
        with patch("backend.config.settings.DEMO_MODE", False):
            appr_id = self.mgr.create_approval(
                action="create_ncr",
                payload={"ncr_id": "NCR-999"},
                agent="inspector",
            )
            resolved = self.mgr.resolve_approval(appr_id, decision="reject", reason="Duplicate NCR")
            self.assertEqual(resolved.status, "rejected")
            self.assertEqual(resolved.decision_reason, "Duplicate NCR")

    def test_resolve_nonexistent_approval_raises_not_found(self):
        with self.assertRaises(StrandNotFoundError):
            self.mgr.resolve_approval("APPR-NONEXISTENT", decision="approve")

    def test_double_resolve_raises_validation_error(self):
        with patch("backend.config.settings.DEMO_MODE", False):
            appr_id = self.mgr.create_approval(
                action="send_rfi",
                payload={"rfi_id": "RFI-103"},
                agent="guardian",
            )
            self.mgr.resolve_approval(appr_id, decision="approve")
            with self.assertRaises(StrandValidationError):
                self.mgr.resolve_approval(appr_id, decision="reject")
