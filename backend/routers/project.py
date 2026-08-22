from fastapi import APIRouter, HTTPException, status
from loguru import logger
from backend.graph.client import neo4j_client
from backend.redis_client import redis_client
from backend.config import settings
from backend.routers.health import agent_statuses

router = APIRouter(prefix="/project", tags=["project"])

@router.get("/")
async def get_project_metadata():
    """Retrieve global project metadata."""
    try:
        # Baseline project data
        project_data = {
            "project_id": "PRJ-942-HYPERSCALE",
            "name": "Hyperscale Data Centre Build",
            "location": "Mumbai, IN",
            "status": "In Progress",
            "completion_percentage": 35,
            "tier_rating": "Tier IV",
            "standard": "TIA-942",
        }
        return {"ok": True, "data": project_data}
    except Exception as e:
        logger.error(f"Error fetching project metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL", "message": "Failed to fetch project metadata"}}
        )

@router.get("/stats")
async def get_project_stats():
    """Retrieve high-level graph statistics for the dashboard."""
    try:
        # Get basic node counts from Neo4j
        results = neo4j_client.execute_query("MATCH (n) RETURN labels(n) as label, count(n) as count")
        stats = {}
        total_nodes = 0
        if results:
            for r in results:
                labels = r.get("label", [])
                label = labels[0] if labels else "Unknown"
                count = r.get("count", 0)
                stats[label] = count
                total_nodes += count
        
        return {
            "ok": True,
            "data": {
                "total_nodes": total_nodes,
                "breakdown": stats
            }
        }
    except Exception as e:
        logger.error(f"Error fetching project stats: {e}")
        # Return fallback stats if graph is down
        return {
            "ok": True,
            "data": {
                "total_nodes": 1420,
                "breakdown": {
                    "ContractClause": 10,
                    "Task": 100,
                    "Supplier": 8,
                    "Shipment": 15
                },
                "note": "fallback_data"
            }
        }


def _compute_immunity_score(
    critical_violations: int,
    systemic_r0_count: int,
    at_risk_shipments: int,
    open_ncrs_critical: int,
) -> float:
    """
    Immunity Score = 100 - (critical_violations * 15) - (systemic_r0_count * 10)
                       - (at_risk_shipments * 3) - (open_ncrs_critical * 5)
    Clamped to [0, 100].
    """
    score = 100.0
    score -= critical_violations * 15
    score -= systemic_r0_count * 10
    score -= at_risk_shipments * 3
    score -= open_ncrs_critical * 5
    return max(0.0, min(100.0, round(score, 1)))


def _systemic_r0_count(sched: dict | None) -> tuple[int, dict]:
    """Count distinct systemic contagion events.

    Linked Guardian submittals with R0 >= 5 count once each.
    Unlinked CPM tasks only count at R0 >= 7 (plan: systemic failure), so the
    baseline 100-task CSV does not zero the dashboard by itself.
    """
    sched = sched or {}
    tasks = sched.get("at_risk_tasks") or []
    r0_scores = sched.get("r0_scores") or {}
    clusters: set[str] = set()
    raw_ge_5 = 0
    if tasks:
        for task in tasks:
            r0 = float(task.get("r0_score") or 0)
            if r0 >= 5.0:
                raw_ge_5 += 1
            if r0 >= 5.0 and task.get("submittal_linked") and task.get("submittal_id"):
                clusters.add(f"submittal:{task.get('submittal_id')}")
            elif r0 >= 7.0:
                clusters.add(str(task.get("equipment_tag") or task.get("discipline") or task.get("task_id")))
        return len(clusters), {"raw_tasks_ge_5": raw_ge_5, "clusters": sorted(clusters), "source": "tasks"}
    max_r0 = max((float(value or 0) for value in r0_scores.values()), default=0.0)
    count = 1 if max_r0 >= 5.0 else 0
    return count, {"raw_tasks_ge_5": sum(1 for value in r0_scores.values() if float(value or 0) >= 5.0), "clusters": ["r0_max"] if count else [], "source": "r0_map"}


@router.get("/summary")
async def get_project_summary():
    """Phase 2: unified dashboard summary with immunity score.

    Returns: immunity_score, violations_today, open_ncrs, at_risk_shipments,
             critical_r0_max, agents
    """
    # Collect data from each subsystem, with graceful fallbacks

    # 1. Guardian violations — latest vendor submittal first
    violations_today = 0
    critical_violations = 0
    try:
        from backend.project_state import load_latest
        latest = load_latest()
        if latest:
            viols = latest.get("violations") or []
            violations_today = len(viols)
            critical_violations = sum(
                1 for v in viols if str(v.get("severity", "")).lower() in {"critical", "systemic"}
            )
        if violations_today == 0:
            for key in redis_client.keys("cache:guardian:*"):
                cached = redis_client.get_json(key)
                if cached:
                    viols = cached.get("violations", [])
                    violations_today += len(viols)
                    critical_violations += sum(
                        1 for v in viols if v.get("severity", "").lower() == "critical"
                    )
    except Exception as e:
        logger.warning(f"Summary: guardian data unavailable: {e}")
        if settings.DEMO_MODE:
            violations_today = 2
            critical_violations = 1
    if settings.DEMO_MODE and violations_today == 0:
        violations_today = 2
        critical_violations = 1

    # 2. Scheduler R0 — prefer the v2 cache the scheduler route actually writes
    critical_r0_max = 0.0
    systemic_r0_count = 0
    try:
        sched_cached = redis_client.get_cache("scheduler:latest:v2") or redis_client.get_cache("scheduler:latest")
        if not sched_cached:
            from backend.agents.scheduler import run_scheduler
            sched_cached = await run_scheduler()
            redis_client.set_cache("scheduler:latest:v2", sched_cached, ttl=600)
        r0_scores = sched_cached.get("r0_scores", {}) if sched_cached else {}
        if r0_scores:
            critical_r0_max = max(float(v or 0) for v in r0_scores.values())
        systemic_r0_count, _ = _systemic_r0_count(sched_cached)
    except Exception as e:
        logger.warning(f"Summary: scheduler data unavailable: {e}")
        if settings.DEMO_MODE:
            critical_r0_max = 4.2

    # 3. Oracle at-risk shipments
    at_risk_shipments = 0
    try:
        from backend.agents.oracle import run_oracle
        oracle_result = await run_oracle()
        at_risk_shipments = oracle_result.get("at_risk_count", 0)
    except Exception as e:
        logger.warning(f"Summary: oracle data unavailable: {e}")
        if settings.DEMO_MODE:
            at_risk_shipments = 3

    # 4. Open NCRs: submittal clones for the dashboard count; field NCRs for immunity
    open_ncrs = 0
    open_ncrs_critical = 0
    immunity_ncrs_critical = 0
    try:
        from backend.project_state import ncrs_from_submittal
        submittal_ncrs = ncrs_from_submittal()
        if submittal_ncrs:
            open_ncrs = len(submittal_ncrs)
            open_ncrs_critical = sum(1 for n in submittal_ncrs if n.get("severity") == "Critical")
        ncr_results = neo4j_client.execute_query(
            """
            MATCH (n:NCR)
            WITH properties(n) AS props
            WHERE props.status = 'open'
            RETURN props
            """
        )
        if ncr_results:
            field_open = len(ncr_results)
            field_tags = {
                str(n.get("props", {}).get("equipment_tag") or n.get("props", {}).get("ncr_id"))
                for n in ncr_results
                if str(n.get("props", {}).get("severity", "")).lower() in ("critical", "systemic")
            }
            immunity_ncrs_critical = len(field_tags)
            if not submittal_ncrs:
                open_ncrs = field_open
                open_ncrs_critical = immunity_ncrs_critical
    except Exception as e:
        logger.warning(f"Summary: NCR data unavailable: {e}")
        if settings.DEMO_MODE:
            open_ncrs = 5
            open_ncrs_critical = 1
            immunity_ncrs_critical = 1
    if settings.DEMO_MODE and open_ncrs == 0:
        open_ncrs = max(open_ncrs, 5)
        open_ncrs_critical = max(open_ncrs_critical, 1)
        immunity_ncrs_critical = max(immunity_ncrs_critical, 1)

    # Compute immunity score
    immunity_score = _compute_immunity_score(
        critical_violations=critical_violations,
        systemic_r0_count=systemic_r0_count,
        at_risk_shipments=at_risk_shipments,
        open_ncrs_critical=immunity_ncrs_critical,
    )

    payload = {
        "immunity_score": immunity_score,
        "violations_today": violations_today,
        "open_ncrs": open_ncrs,
        "at_risk_shipments": at_risk_shipments,
        "critical_r0_max": round(critical_r0_max, 1),
        "penalties": {
            "critical_violations": critical_violations * 15,
            "systemic_r0": systemic_r0_count * 10,
            "at_risk_shipments": at_risk_shipments * 3,
            "critical_ncrs": immunity_ncrs_critical * 5,
        },
        "agents": {k: v.get("status", "idle") for k, v in agent_statuses().items()},
        "demo_mode": settings.DEMO_MODE,
    }
    return payload


@router.get("/immunity-score")
async def get_immunity_score():
    """Standalone immunity score endpoint."""
    summary = await get_project_summary()
    return {
        "score": summary["immunity_score"],
        "breakdown": summary["penalties"],
    }
