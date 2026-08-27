"""
Authentication and authorisation.

Role checks live here as FastAPI dependencies so that every protected route
declares its required role in its signature. A route with no role dependency
is unreachable without a token at all — `get_current_user` is what validates
it (docs/security.md §1, §2).
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.db import fetch_one

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    user_id: int
    role: str
    email: str
    # Present only for alumni accounts. The database guarantees this
    # (chk_users_student_link in migration 002).
    student_id: str | None = None


# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        # Malformed hash in the database — treat as a failed login rather
        # than a 500, but never as a success.
        return False


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #
def create_access_token(user: CurrentUser) -> tuple[str, int]:
    settings = get_settings()
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    payload = {
        "sub": str(user.user_id),
        "role": user.role,
        "email": user.email,
        "student_id": user.student_id,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "NOT_AUTHENTICATED", "message": "Sign in to continue."},
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    """Validate the bearer token before any business logic runs."""
    if creds is None:
        raise CREDENTIALS_ERROR

    settings = get_settings()
    try:
        payload = jwt.decode(
            creds.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Your session has expired. Sign in again."},
        )
    except jwt.InvalidTokenError:
        raise CREDENTIALS_ERROR

    # The account must still be active — a token issued before deactivation
    # must stop working immediately, so the role is re-read from the database
    # rather than trusted from the token alone.
    row = fetch_one(
        "SELECT user_id, role_code, email, student_id, status "
        "FROM users WHERE user_id = %s",
        (payload.get("sub"),),
    )
    if row is None or row["status"] != "active":
        raise CREDENTIALS_ERROR

    return CurrentUser(
        user_id=row["user_id"],
        role=row["role_code"],
        email=row["email"],
        student_id=row["student_id"],
    )


# --------------------------------------------------------------------------- #
# Role gates
# --------------------------------------------------------------------------- #
def require_roles(*allowed: str):
    """Dependency factory: allow only the named roles."""

    def dependency(
        user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": "Your account doesn't have access to this.",
                },
            )
        return user

    return dependency


require_admin = require_roles("admin")
require_staff = require_roles("admin", "faculty")   # read access to all records
require_any = get_current_user


def assert_can_read_alumni(user: CurrentUser, student_id: str) -> None:
    """
    Alumni may read only their own record; staff may read any.

    Called by every endpoint that returns a single alumnus's data. The check
    compares against the token's student_id, never a value from the request
    body (docs/security.md §2.1).
    """
    if user.role in ("admin", "faculty"):
        return
    if user.role == "alumni" and user.student_id == student_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "FORBIDDEN", "message": "You can only view your own profile."},
    )


def can_see_contact_details(user: CurrentUser, student_id: str) -> bool:
    """
    Personal email and phone are restricted (docs/security.md §4).

    Default is the most restrictive reading: the alumnus themselves, and
    admins. Faculty are excluded until the department approves a visibility
    policy. Change this one function when that decision is made.
    """
    if user.role == "admin":
        return True
    return user.role == "alumni" and user.student_id == student_id
