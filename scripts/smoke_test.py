# scripts/smoke_test.py — Smoke test suite for STRAND FastAPI application
from __future__ import annotations

import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from backend.main import app


async def run_smoke_test():
    print("==================================================")
    print("        STRAND BACKEND SMOKE TEST SUITE          ")
    print("==================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Checks
        print("\n[1/5] Running Health Checks...")
        try:
            res = await client.get("/api/v1/health")
            assert res.status_code == 200, f"Expected 200, got {res.status_code}"
            data = res.json()
            assert data.get("status") == "ok", "Backend health status is not ok"
            print("  health endpoint: [PASS]")
        except Exception as e:
            print(f"  health endpoint: [FAIL] ({e})")

        # 2. Project Summary
        print("\n[2/5] Running Project Summary & Immunity Checks...")
        try:
            res = await client.get("/api/v1/project/summary")
            assert res.status_code == 200, f"Expected 200, got {res.status_code}"
            data = res.json()
            assert "immunity_score" in data, "immunity_score missing from summary"
            print(f"  project summary: [PASS] (Immunity Score: {data['immunity_score']})")
        except Exception as e:
            print(f"  project summary: [FAIL] ({e})")

        # 3. Scheduler Endpoints
        print("\n[3/5] Running Scheduler Checks...")
        try:
            res_risks = await client.get("/api/v1/scheduler/risks")
            assert res_risks.status_code == 200, f"Expected 200, got {res_risks.status_code}"
            data_risks = res_risks.json()
            assert "at_risk_tasks" in data_risks, "at_risk_tasks missing"
            print(f"  scheduler risks: [PASS] ({data_risks['count']} at-risk tasks)")

            res_cp = await client.get("/api/v1/scheduler/critical-path")
            assert res_cp.status_code == 200
            print("  scheduler critical path: [PASS]")
        except Exception as e:
            print(f"  scheduler endpoints: [FAIL] ({e})")

        # 4. Oracle Endpoints
        print("\n[4/5] Running Oracle Supply Chain Checks...")
        try:
            res_ship = await client.get("/api/v1/oracle/shipments")
            assert res_ship.status_code == 200, f"Expected 200, got {res_ship.status_code}"
            data_ship = res_ship.json()
            assert data_ship.get("type") == "FeatureCollection", "Shipments output is not a GeoJSON FeatureCollection"
            print(f"  oracle GeoJSON shipments: [PASS] ({len(data_ship.get('features', []))} features)")
        except Exception as e:
            print(f"  oracle endpoints: [FAIL] ({e})")

        # 5. Inspector Endpoints
        print("\n[5/5] Running Inspector Checklist Checks...")
        try:
            res_check = await client.get("/api/v1/inspector/checklist/GEN-01")
            assert res_check.status_code == 200, f"Expected 200, got {res_check.status_code}"
            data_check = res_check.json()
            assert len(data_check.get("steps", [])) == 23, "Checklist does not contain 23 steps"
            print("  inspector checklist: [PASS]")
        except Exception as e:
            print(f"  inspector endpoints: [FAIL] ({e})")

    print("\n==================================================")
    print("             SMOKE TEST RUN COMPLETE              ")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_smoke_test())
