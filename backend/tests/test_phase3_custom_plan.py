from __future__ import annotations

import asyncio
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException
from jose import JWTError

from backend.agents.inspector import close_checklist_session, get_checklist
from backend.deps import _current_user_from_payload
from backend.main import app
from backend.routers.dashboards import sanitize_and_inject_tenant


class InspectorAgentTests(unittest.TestCase):
    def test_checklist_has_required_phase3_contract(self):
        checklist = asyncio.run(get_checklist("GEN-01"))

        self.assertEqual(checklist["equipment_tag"], "GEN-01")
        self.assertEqual(len(checklist["steps"]), 23)
        self.assertEqual(checklist["steps"][0]["step_id"], "IST-001")
        self.assertIn("acceptance_criteria", checklist["steps"][0])

    def test_close_checklist_session_generates_as_built_markdown(self):
        steps = [
            {
                "step_id": "IST-001",
                "sequence": 1,
                "description": "Foundation compliance",
                "status": "pass",
                "notes": "Anchor bolts verified",
            },
            {
                "step_id": "IST-002",
                "sequence": 2,
                "description": "Fuel rate",
                "status": "fail",
                "notes": "Raised NCR",
            },
        ]
        record = asyncio.run(close_checklist_session("GEN-01", steps, closed_by="qa_test"))
        markdown_path = Path(record["markdown_path"])
        try:
            self.assertTrue(record["record_id"].startswith("ABR-"))
            self.assertEqual(record["pass_count"], 1)
            self.assertEqual(record["fail_count"], 1)
            self.assertEqual(record["ncr_count"], 1)
            self.assertTrue(markdown_path.exists())
            self.assertIn("As-Built Commissioning Record", markdown_path.read_text(encoding="utf-8"))
        finally:
            markdown_path.unlink(missing_ok=True)


class InspectorRouteWiringTests(unittest.TestCase):
    def test_ncr_route_awaits_agent_function(self):
        async def run_request():
            with patch(
                "backend.routers.inspector.process_voice_ncr",
                new=AsyncMock(
                    return_value={
                        "ncr_id": "NCR-TEST",
                        "equipment_tag": "GEN-01",
                        "step_id": "IST-002",
                        "r0_score": 4.2,
                        "severity": "Major",
                    }
                ),
            ) as agent_mock:
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/inspector/ncr",
                        json={
                            "transcript": "Fuel consumption reads high",
                            "equipment_tag": "GEN-01",
                            "step_id": "IST-002",
                        },
                    )
                return response, agent_mock

        response, agent_mock = asyncio.run(run_request())

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["ncr_id"], "NCR-TEST")
        agent_mock.assert_awaited_once()

    def test_close_route_awaits_agent_function(self):
        async def run_request():
            with patch(
                "backend.routers.inspector.close_checklist_session",
                new=AsyncMock(
                    return_value={
                        "status": "closed",
                        "record_id": "ABR-TEST",
                        "as_built_id": "ABR-TEST",
                    }
                ),
            ) as agent_mock:
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/inspector/checklist/GEN-01/close",
                        json={
                            "steps": [{"step_id": "IST-001", "status": "pass"}],
                            "closed_by": "qa_test",
                        },
                    )
                return response, agent_mock

        response, agent_mock = asyncio.run(run_request())

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["record_id"], "ABR-TEST")
        agent_mock.assert_awaited_once()


class HealthAndCompatibilityRouteTests(unittest.TestCase):
    def test_root_health_has_all_agent_status_objects(self):
        async def run_request():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.get("/health")

        response = asyncio.run(run_request())
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "healthy")
        for agent in ("guardian", "scheduler", "oracle", "inspector", "brain", "judge"):
            self.assertIn(agent, payload["agents"])
            self.assertEqual(payload["agents"][agent]["status"], "active")

    def test_dashboard_build_uses_live_agent_sources(self):
        async def run_request():
            with (
                patch(
                    "backend.routers.dashboards.generate_dashboard_config",
                    new=AsyncMock(
                        return_value={
                            "dashboard_name": "QA Dashboard",
                            "layout": [],
                            "queries": {},
                        }
                    ),
                ),
                patch(
                    "backend.routers.dashboards.run_oracle",
                    new=AsyncMock(
                        return_value={
                            "at_risk_shipments": [
                                {"shipment_id": "SHIP-1", "equipment_tag": "CT-01", "risk_flag": True, "delay_days": 5}
                            ]
                        }
                    ),
                ),
                patch(
                    "backend.routers.dashboards.run_scheduler",
                    new=AsyncMock(
                        return_value={
                            "at_risk_tasks": [
                                {"task_id": "T023", "r0_score": 4.2, "severity": "Critical"}
                            ]
                        }
                    ),
                ),
                patch("backend.routers.dashboards.list_ncrs", new=AsyncMock(return_value=[])),
            ):
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    return await client.post(
                        "/api/v1/dashboard/build",
                        json={
                            "prompt": "Build current spec violations and at-risk shipments",
                            "tenant_id": "tenant_a",
                            "project_id": "PROJ-001",
                        },
                    )

        response = asyncio.run(run_request())
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["tenant_id"], "tenant_a")
        self.assertTrue(payload["widgets"])
        self.assertIn("oracle", payload["sources"])
        oracle_widget = next(widget for widget in payload["widgets"] if widget["source"] == "oracle")
        self.assertEqual(oracle_widget["data"][0]["shipment_id"], "SHIP-1")

    def test_dashboard_build_rejects_empty_prompt(self):
        async def run_request():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.post(
                    "/api/v1/dashboard/build",
                    json={"prompt": "", "project_id": "PROJ-001"},
                )

        response = asyncio.run(run_request())
        self.assertEqual(response.status_code, 422)


class TenantChatIsolationTests(unittest.TestCase):
    def test_chat_memory_is_scoped_by_tenant_and_session(self):
        async def run_requests():
            with patch(
                "backend.routers.chat.run_brain",
                new=AsyncMock(
                    return_value={
                        "answer": "Cooling tower ambient temperature requirement is 50°C.",
                        "citations": [],
                        "confidence": "High",
                    }
                ),
            ):
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                    first = await client.post(
                        "/api/v1/chat/message",
                        json={
                            "tenant_id": "tenant_a",
                            "session_id": "session_1",
                            "message": "What is the ambient temperature requirement for the cooling tower?",
                        },
                    )
                    followup = await client.post(
                        "/api/v1/chat/message",
                        json={
                            "tenant_id": "tenant_a",
                            "session_id": "session_1",
                            "message": "And what happens if that requirement is violated?",
                        },
                    )
                    tenant_b = await client.post(
                        "/api/v1/chat/message",
                        json={
                            "tenant_id": "tenant_b",
                            "session_id": "session_2",
                            "message": "Show me all the violations you know about",
                        },
                    )
                    new_session = await client.post(
                        "/api/v1/chat/message",
                        json={
                            "tenant_id": "tenant_a",
                            "session_id": "session_new",
                            "message": "What did we discuss earlier about the cooling tower?",
                        },
                    )
                return first, followup, tenant_b, new_session

        first, followup, tenant_b, new_session = asyncio.run(run_requests())
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(followup.status_code, 200, followup.text)
        self.assertGreaterEqual(followup.json()["history_length"], 4)
        self.assertEqual(tenant_b.status_code, 200, tenant_b.text)
        self.assertIn("tenant_b", tenant_b.json()["reply"])
        self.assertNotIn("Cooling tower ambient", tenant_b.json()["reply"])
        self.assertEqual(new_session.status_code, 200, new_session.text)
        self.assertIn("do not have earlier messages", new_session.json()["reply"])


class CustomPlanSecurityTests(unittest.TestCase):
    def test_current_user_extracts_rbac_claims_without_profile_lookup(self):
        user = _current_user_from_payload(
            {
                "sub": "user-123",
                "email": "qa@example.com",
                "app_metadata": {"tenant_id": "tenant_a", "role": "admin"},
            }
        )

        self.assertEqual(user.id, "user-123")
        self.assertEqual(user.tenant_id, "tenant_a")
        self.assertEqual(user.role, "admin")

    def test_current_user_requires_tenant_and_role_claims(self):
        with self.assertRaises(JWTError):
            _current_user_from_payload({"sub": "user-123", "email": "qa@example.com"})

    def test_dashboard_sanitizer_blocks_mutators(self):
        with self.assertRaises(HTTPException):
            sanitize_and_inject_tenant(
                "MATCH (s:VendorSubmittal) CREATE (x:Bad) RETURN x",
                "tenant_a",
            )

    def test_dashboard_sanitizer_injects_tenant_for_simple_read(self):
        secured = sanitize_and_inject_tenant(
            "MATCH (s:VendorSubmittal) RETURN count(s) as value",
            "tenant_a",
        )

        self.assertIn("{tenant_id: $tenant_id}", secured)
        self.assertNotIn("CREATE", secured.upper())

    def test_dashboard_sanitizer_rejects_literal_tenant_scope(self):
        with self.assertRaises(HTTPException):
            sanitize_and_inject_tenant(
                "MATCH (s:VendorSubmittal {tenant_id: 'tenant_b'}) RETURN s",
                "tenant_a",
            )


if __name__ == "__main__":
    unittest.main()
