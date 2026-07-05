from fastapi import APIRouter, HTTPException, status
from loguru import logger
from backend.graph.client import neo4j_client

router = APIRouter(prefix="/project", tags=["project"])

@router.get("/")
async def get_project_metadata():
    """Retrieve global project metadata."""
    try:
        # Mock project data for the hackathon
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
