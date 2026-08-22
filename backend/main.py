from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from loguru import logger

from backend.config import settings
from backend.deps import limiter
from backend.errors import StrandError
from backend.routers import health, documents, guardian, scheduler, oracle, inspector, brain, approvals, metrics, planner, judge, project, dashboards, admin, integrations, chat


def _seed_chroma_if_empty() -> None:
    from backend.vector.store import chroma_store

    if not chroma_store.is_available:
        logger.warning("Chroma unavailable — skipping document seed")
        return
    try:
        if chroma_store.count() > 0:
            return
    except Exception:
        return

    from backend.ingestion.pipeline import ingest_document

    root = Path(__file__).resolve().parent.parent
    seeds = [
        (root / "data" / "spec_tia942_synthetic.pdf", "spec"),
        (root / "data" / "vendor_submittal_cooling_tower.pdf", "submittal"),
        (root / "data" / "vendor_submittal_ups_compliant.pdf", "submittal"),
        (root / "data" / "vendor_submittal_generator_minor.pdf", "submittal"),
        (root / "data" / "project_schedule_100tasks.csv", "schedule"),
    ]
    for path, doc_type in seeds:
        if not path.exists():
            continue
        try:
            result = ingest_document(str(path), document_type=doc_type, tenant_id="default")
            logger.info("Seeded {} -> {}", path.name, result.get("status"))
        except Exception as exc:
            logger.warning("Failed to seed {}: {}", path.name, exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_chroma_if_empty()
    yield


app = FastAPI(
    title="STRAND API",
    description="Backend API services for STRAND construction intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Ensure static asset directories exist and mount static route
static_dir = Path("static")
static_dir.mkdir(parents=True, exist_ok=True)
(static_dir / "ncr_photos").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(StrandError)
async def strand_error_handler(request: Request, exc: StrandError):
    """Surface StrandError with the documented {ok, error} envelope and the
    correct status code, instead of a bare 500. Makes degraded/unavailable
    states visible to clients rather than silently swallowed."""
    return JSONResponse(status_code=exc.status_code, content=exc.to_envelope())

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
app.include_router(dashboards.compat_router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to STRAND API Platform",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
