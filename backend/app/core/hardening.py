"""
Production hardening.

Two things the prototype needs before it faces anything but localhost:
security response headers, and a brake on password guessing.

Both are deliberately simple. The throttle is in-process, which is correct
for a single-worker departmental deployment and *not* correct behind several
workers or machines — see the note on `LoginThrottle`.
"""

import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Response headers that cost nothing and close off whole categories of
    attack. The CSP is strict because this app loads no third-party scripts:
    everything is served from its own origin, and the only outside resource
    is the Google Fonts stylesheet the frontend links.
    """

    def __init__(self, app, *, https: bool = False, frontend_origin: str = ""):
        super().__init__(app)
        self.https = https
        self.frontend_origin = frontend_origin

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )
        # Alumni records shouldn't sit in a shared proxy cache.
        response.headers["Cache-Control"] = "no-store"

        connect = "'self'"
        if self.frontend_origin:
            connect = f"'self' {self.frontend_origin}"

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            f"connect-src {connect}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        if self.https:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response


class LoginThrottle:
    """
    Slows down password guessing against a known Student ID.

    Only *failed* attempts count, so a busy legitimate user is never locked
    out by their own successful sign-ins. The window is per identifier and
    per client address, so one attacker cannot lock a real alumnus out of
    their own account by failing on purpose from elsewhere.

    State is in-process. With multiple uvicorn workers each keeps its own
    counter, which multiplies the effective limit by the worker count — fine
    for a departmental deployment, but move this to Redis or the database
    before running several workers or instances.
    """

    def __init__(self, max_failures: int = 10, window_seconds: int = 300):
        self.max_failures = max_failures
        self.window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _key(self, identifier: str, client: str) -> str:
        return f"{identifier.lower()}|{client}"

    def _prune(self, attempts: deque[float], now: float) -> None:
        while attempts and now - attempts[0] > self.window:
            attempts.popleft()

    def is_blocked(self, identifier: str, client: str) -> int:
        """Returns seconds to wait, or 0 if the attempt may proceed."""
        now = time.monotonic()
        attempts = self._failures[self._key(identifier, client)]
        self._prune(attempts, now)
        if len(attempts) < self.max_failures:
            return 0
        return max(1, int(self.window - (now - attempts[0])))

    def record_failure(self, identifier: str, client: str) -> None:
        now = time.monotonic()
        attempts = self._failures[self._key(identifier, client)]
        self._prune(attempts, now)
        attempts.append(now)

    def clear(self, identifier: str, client: str) -> None:
        """A successful sign-in wipes the slate for that pair."""
        self._failures.pop(self._key(identifier, client), None)


login_throttle = LoginThrottle()


def client_address(request: Request) -> str:
    """
    Best-effort client identity.

    X-Forwarded-For is only trusted when the app is told it sits behind a
    proxy — otherwise a client could set the header itself and sidestep the
    throttle entirely by rotating fake values.
    """
    if getattr(request.app.state, "behind_proxy", False):
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
