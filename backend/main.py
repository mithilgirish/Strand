from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.routers import health, documents, guardian, scheduler, oracle, inspector, brain

app = FastAPI(
    title="STRAND API",
    description="Backend API services for STRAND construction intelligence platform",
    version="1.0.0"
)

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

@app.get("/")
async def root():
    return {
        "message": "Welcome to STRAND API Platform",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
