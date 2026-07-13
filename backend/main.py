from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.config import settings
from backend.deps import limiter
from backend.routers import health, documents, guardian, scheduler, oracle, inspector, brain, approvals, metrics, planner, judge, project, dashboards, admin

app = FastAPI(
    title="STRAND API",
    description="Backend API services for STRAND construction intelligence platform",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(guardian.router, prefix="/api/v1")
app.include_router(scheduler.router, prefix="/api/v1")
app.include_router(oracle.router, prefix="/api/v1")
app.include_router(inspector.router, prefix="/api/v1")
app.include_router(brain.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")
app.include_router(metrics.router, prefix="/api/v1")
app.include_router(planner.router, prefix="/api/v1")
app.include_router(judge.router, prefix="/api/v1")
app.include_router(project.router, prefix="/api/v1")
app.include_router(dashboards.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to STRAND API Platform",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
