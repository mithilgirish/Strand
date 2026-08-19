from __future__ import annotations

import asyncio
import unittest

import pandas as pd
import httpx

from backend.agents.oracle import (
    find_alternative_suppliers,
    get_geospatial_shipments,
    get_supply_chain_tree,
)
from backend.agents.scheduler import scheduler_graph
from backend.main import app


class Phase2AgentTests(unittest.TestCase):
    def test_scheduler_published_acceptance_contract(self):
        schedule = pd.read_csv("data/project_schedule_100tasks.csv").to_dict("records")
        result = asyncio.run(
            scheduler_graph.ainvoke(
                {
                    "schedule_data": schedule,
                    "task_graph": None,
                    "at_risk_tasks": [],
                    "r0_scores": {},
                    "critical_path": [],
                    "mitigation_suggestions": [],
                }
            )
        )
        risks = {task["task_id"]: task for task in result["at_risk_tasks"]}
        for task_id in ("T023", "T047", "T078"):
            self.assertGreater(risks[task_id]["delay_probability"], 0.8)
            self.assertGreater(risks[task_id]["r0_score"], 2.0)
            self.assertLessEqual(risks[task_id]["r0_score"], 10.0)
        self.assertEqual(len(result["mitigation_suggestions"]), 3)

    def test_oracle_is_deterministic_and_complete(self):
        first = get_geospatial_shipments()
        second = get_geospatial_shipments()
        self.assertEqual(first, second)
        self.assertGreaterEqual(len(first["features"]), 10)
        self.assertGreaterEqual(
            sum(feature["properties"]["risk_flag"] for feature in first["features"]),
            3,
        )
        self.assertIn("tier", first["features"][0]["properties"])

        risk = next(feature for feature in first["features"] if feature["properties"]["risk_flag"])
        properties = risk["properties"]
        tree = get_supply_chain_tree(properties["shipment_id"])
        self.assertEqual(tree["root"]["tier"], 1)
        self.assertTrue(tree["root"]["children"])
        self.assertTrue(tree["root"]["children"][0]["children"])
        self.assertEqual(
            len(find_alternative_suppliers(properties["equipment_tag"], properties["supplier_id"])),
            3,
        )


class Phase2RouteTests(unittest.TestCase):
    def test_required_routes(self):
        routes = (
            "/api/v1/scheduler/risks",
            "/api/v1/scheduler/critical-path",
            "/api/v1/scheduler/r0",
            "/api/v1/scheduler/r0/T023",
            "/api/v1/oracle/shipments",
            "/api/v1/oracle/shipments/at-risk",
            "/api/v1/oracle/supply-chain/SHIP-005",
            "/api/v1/oracle/alternatives/EQ-GEN-01?failing_supplier_id=SUPP-006",
            "/api/v1/project/immunity-score",
            "/api/v1/project/summary",
        )
        async def run_requests():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                responses = {route: await client.get(route) for route in routes}
                return responses

        responses = asyncio.run(run_requests())
        for route, response in responses.items():
            with self.subTest(route=route):
                self.assertEqual(response.status_code, 200, response.text)

        task_r0 = responses["/api/v1/scheduler/r0/T023"].json()
        self.assertGreater(task_r0["downstream_count"], 0)
        summary = responses["/api/v1/project/summary"].json()
        # The immunity score must be a valid 0-100 value. We no longer assert a
        # narrow 50-80 band: that band only held because fabricated fallback
        # numbers were injected when subsystems returned zero. With honest
        # degradation a genuinely clean project can legitimately score higher.
        self.assertGreaterEqual(summary["immunity_score"], 0)
        self.assertLessEqual(summary["immunity_score"], 100)
        self.assertIn("demo_mode", summary)


if __name__ == "__main__":
    unittest.main()
