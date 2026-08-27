"""
IUB International Business Alumni Information Management System — API.

Run in development:
    cd backend
    uvicorn app.main:app --reload

Interactive docs at http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import DatabaseError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.db import close_pool, get_cursor, init_pool
from app.core.hardening import SecurityHeadersMiddleware, login_throttle
from app.routers import admin, alumni, auth, dashboard, submissions, users

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    # Fail loudly at startup rather than on the first request at 2am.
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
    except Exception:
        logger.exception("Could not reach PostgreSQL at startup")
        raise
    yield
    close_pool()


settings = get_settings()

app = FastAPI(
    title="IUB Alumni Information Management System",
    version="0.1.0",
    description="Prototype API for the Department of International Business, IUB.",
    lifespan=lifespan,
)

app.state.behind_proxy = settings.BEHIND_PROXY
login_throttle.max_failures = settings.LOGIN_MAX_FAILURES
login_throttle.window = settings.LOGIN_WINDOW_SECONDS

app.add_middleware(
    SecurityHeadersMiddleware,
    https=settings.HTTPS_ENABLED,
    frontend_origin="" if settings.SERVE_FRONTEND_DIR else settings.FRONTEND_ORIGIN,
)

# When the frontend is served from this same process there is no cross-origin
# request to permit, so CORS stays off entirely — a smaller surface than
# allowing an origin you no longer need.
if not settings.SERVE_FRONTEND_DIR:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(alumni.router)
app.include_router(submissions.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(users.router)


# --------------------------------------------------------------------------- #
# Error handling
# --------------------------------------------------------------------------- #
# Errors are returned in the {"error": {...}} shape from docs/api_spec.md §1.3.
# Database errors are logged server-side and replaced with a generic message,
# so raw SQL text, table names, and stack traces never reach the client
# (docs/security.md §3).
@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        error = detail
    else:
        error = {"code": "ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": error},
                        headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first.get("msg", "The request could not be processed."),
                "field": field or None,
            }
        },
    )


@app.exception_handler(DatabaseError)
async def database_error(request: Request, exc: DatabaseError):
    logger.exception("Database error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "SERVER_ERROR",
                "message": "Something went wrong. Try again.",
            }
        },
    )


@app.get("/api/health", tags=["health"])
def health():
    """Liveness plus a real database round trip, for a deployment check."""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
        return {"status": "ok", "database": "ok"}
    except Exception:
        logger.exception("Health check failed")
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "unreachable"},
        )


# --------------------------------------------------------------------------- #
# Serving the built frontend
# --------------------------------------------------------------------------- #
# Optional: set SERVE_FRONTEND_DIR to frontend/dist to run the whole system on
# one origin. Registered last so it never shadows an /api route.
if settings.SERVE_FRONTEND_DIR:
    dist = Path(settings.SERVE_FRONTEND_DIR).resolve()
    index = dist / "index.html"
    if not index.is_file():
        raise RuntimeError(
            f"SERVE_FRONTEND_DIR is set to {dist}, but there is no index.html "
            f"there. Run `npm run build` in frontend/ first."
        )

    # Hashed asset filenames are safe to cache hard; index.html must not be,
    # or a deploy leaves people on the previous build.
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        """
        Client-side routing: every unmatched path returns index.html so a
        refresh on /directory works instead of 404ing.

        Unknown /api paths are excluded, or a typo in an endpoint would
        return HTML to something expecting JSON.
        """
        if full_path.startswith("api/"):
            return JSONResponse(
                status_code=404,
                content={"error": {"code": "NOT_FOUND", "message": "No such endpoint."}},
            )
        return FileResponse(index, headers={"Cache-Control": "no-store"})
