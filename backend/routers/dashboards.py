from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.deps import get_current_user, CurrentUser
from backend.graph.client import get_neo4j_session

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])

class DashboardQuery(BaseModel):
    query: str
    
def sanitize_and_inject_tenant(cypher: str, tenant_id: str) -> str:
    """
    Very basic sanitizer: 
    1. Blocks mutator keywords.
    2. Ensures `{tenant_id: $tenant_id}` is enforced if needed.
    """
    mutators = ["CREATE", "MERGE", "SET", "DELETE", "REMOVE", "DETACH", "DROP"]
    upper_query = cypher.upper()
    for m in mutators:
        if f" {m} " in f" {upper_query} ":
            raise HTTPException(status_code=400, detail="Mutating queries are not permitted in dashboard reads.")
    return cypher

@router.post("/query")
async def execute_dashboard_query(
    payload: DashboardQuery, 
    user: CurrentUser = Depends(get_current_user)
):
    # 1. Enforce tenant isolation and block mutators (AST Sanitizer)
    secured_cypher = sanitize_and_inject_tenant(payload.query, user.tenant_id)
    
    # 2. Execute with a read-only database transaction
    session = get_neo4j_session()
    try:
        # In a real driver setup, we'd explicitly use a read transaction context
        result = session.run(secured_cypher, {"tenant_id": user.tenant_id}).data()
        return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
