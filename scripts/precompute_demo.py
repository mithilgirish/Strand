# scripts/precompute_demo.py — Pre-caches all demo queries for STRAND
from __future__ import annotations

import asyncio
import os
import sys
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.agents.guardian import run_guardian
from backend.agents.brain import run_brain
from backend.agents.scheduler import run_scheduler
from backend.agents.oracle import run_oracle
from backend.redis_client import redis_client


async def precompute():
    parser = argparse.ArgumentParser(description="Precompute and cache STRAND demo queries")
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify if all demo queries are pre-cached without generating them",
    )
    args = parser.parse_args()

    # Define the keys we expect to be cached
    cache_keys = [
        "cache:scheduler:latest",
        "cache:oracle:default",
        "cache:guardian:DEMO-CT-01",
        "cache:guardian:ACC_Submittal_CoolingTower_REV2.pdf",
        "cache:guardian:SUB-COOLING-01",
        "cache:brain:default:fire suppression requirements for ups rooms",
        "cache:brain:default:tia-942 ambient temperature requirements",
    ]

    if args.verify_only:
        print("Verifying demo cache keys...")
        all_present = True
        for key in cache_keys:
            exists = redis_client.exists(key)
            status = "✅ PRESENT" if exists else "❌ MISSING"
            print(f"  {key}: {status}")
            if not exists:
                all_present = False
        
        if all_present:
            print("All demo cache keys are pre-cached successfully.")
            sys.exit(0)
        else:
            print("Some cache keys are missing. Run without --verify-only to precompute them.")
            sys.exit(1)

    print("Precomputing STRAND demo queries...")

    # 1. Run Scheduler
    print("Precomputing Scheduler risks list...")
    try:
        scheduler_res = await run_scheduler()
        # Set cache explicitly (in case scheduler TTL is short)
        redis_client.set_cache("scheduler:latest", scheduler_res, ttl=86400)
        print("✅ Scheduler cached.")
    except Exception as e:
        print(f"❌ Scheduler failed: {e}")

    # 2. Run Oracle
    print("Precomputing Oracle supply chain / shipments...")
    try:
        oracle_res = await run_oracle("default")
        redis_client.set_cache("oracle:default", oracle_res, ttl=86400)
        print("✅ Oracle cached.")
    except Exception as e:
        print(f"❌ Oracle failed: {e}")

    # 3. Run Guardian
    print("Precomputing Guardian cooling tower analysis...")
    cooling_tower_pdf = "data/vendor_submittal_cooling_tower.pdf"
    if os.path.exists(cooling_tower_pdf):
        for submittal_id in ["DEMO-CT-01", "ACC_Submittal_CoolingTower_REV2.pdf", "SUB-COOLING-01"]:
            try:
                # Remove any existing lock first
                redis_client.delete(f"lock:guardian:{submittal_id}")
                # Run the guardian agent
                guardian_res = await run_guardian(submittal_id, cooling_tower_pdf)
                # Set cache explicitly for 24h
                redis_client.set_cache(f"guardian:{submittal_id}", guardian_res, ttl=86400)
                print(f"✅ Guardian ({submittal_id}) cached.")
            except Exception as e:
                print(f"❌ Guardian ({submittal_id}) failed: {e}")
    else:
        print(f"❌ Guardian skipped: {cooling_tower_pdf} not found.")

    # 4. Run Brain Queries
    brain_queries = [
        "fire suppression requirements for UPS rooms",
        "TIA-942 ambient temperature requirements",
    ]
    for query in brain_queries:
        print(f"Precomputing Brain query: '{query}'...")
        try:
            brain_res = await run_brain(query, "default")
            cache_key = f"brain:default:{query.lower().strip()}"
            redis_client.set_cache(cache_key, brain_res, ttl=86400)
            print(f"✅ Brain query ('{query}') cached.")
        except Exception as e:
            print(f"❌ Brain query ('{query}') failed: {e}")

    print("\nPrecomputation complete.")


if __name__ == "__main__":
    asyncio.run(precompute())
