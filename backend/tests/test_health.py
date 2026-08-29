import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    # It might return healthy or degraded based on db connections, but it should return 200.
    assert data["status"] in ["healthy", "degraded", "error"]
