"""Authentication endpoints (docs/api_spec.md §2)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.db import execute, fetch_one, get_cursor
from app.core.hardening import client_address, login_throttle
from app.core.security import (
    CurrentUser,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import (
    Envelope,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect sign-in details."},
)


@router.post("/login", response_model=Envelope[LoginResponse])
def login(body: LoginRequest, request: Request):
    """
    Sign in with a Student ID (alumni) or an email address (faculty/admin).

    The same error is returned whether the identifier or the password was
    wrong, so the endpoint cannot be used to discover which accounts exist
    (docs/security.md §1).
    """
    # Slow down password guessing before doing any work (docs/security.md §1).
    client = client_address(request)
    wait = login_throttle.is_blocked(body.identifier, client)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "TOO_MANY_ATTEMPTS",
                "message": "Too many failed attempts. Try again in a few minutes.",
            },
            headers={"Retry-After": str(wait)},
        )

    row = fetch_one(
        """
        SELECT u.user_id, u.role_code, u.email, u.password_hash, u.status,
               u.student_id, u.full_name, a.alumni_id
        FROM users u
        LEFT JOIN alumni a ON a.student_id = u.student_id
        WHERE u.student_id = %(id)s OR LOWER(u.email) = LOWER(%(id)s)
        """,
        {"id": body.identifier},
    )

    # Verify the password even when the user does not exist, so a missing
    # account and a wrong password take the same amount of time.
    stored_hash = row["password_hash"] if row else "$2b$12$" + "x" * 53
    password_ok = verify_password(body.password, stored_hash)

    if row is None or not password_ok:
        login_throttle.record_failure(body.identifier, client)
        raise INVALID_CREDENTIALS

    if row["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_NOT_ACTIVE",
                "message": "This account is awaiting verification by the department.",
            },
        )

    login_throttle.clear(body.identifier, client)

    user = CurrentUser(
        user_id=row["user_id"],
        role=row["role_code"],
        email=row["email"],
        student_id=row["student_id"],
    )
    token, expires_in = create_access_token(user)

    execute("UPDATE users SET last_login_at = now() WHERE user_id = %s", (user.user_id,))

    return Envelope(
        data=LoginResponse(
            access_token=token,
            role=user.role,
            expires_in=expires_in,
            student_id=row["student_id"],
            alumni_id=row["alumni_id"],
            full_name=row["full_name"],
        )
    )


@router.post("/register", response_model=Envelope[RegisterResponse], status_code=201)
def register(body: RegisterRequest):
    """
    Alumni profile claiming (PRD §7).

    An alumnus claims an existing record by Student ID. The account is created
    as `pending_verification` — an admin activates it — so registering does not
    by itself grant access to a record.

    The response is deliberately the same whether or not the Student ID exists.
    Otherwise this endpoint becomes a way to test which IDs are on file, and
    the ID format is guessable.
    """
    same_answer = RegisterResponse(
        status="submitted",
        student_id=body.student_id,
        message="If that Student ID is on file, your request has been sent to "
                "the department for verification.",
    )

    alumnus = fetch_one(
        "SELECT student_id FROM alumni "
        "WHERE student_id = %s AND record_status = 'active'",
        (body.student_id,),
    )
    if alumnus is None:
        return Envelope(data=same_answer)

    # A record can only be claimed once (uq_users_student_id).
    if fetch_one("SELECT 1 FROM users WHERE student_id = %s", (body.student_id,)):
        return Envelope(data=same_answer)

    if fetch_one("SELECT 1 FROM users WHERE LOWER(email) = LOWER(%s)", (body.email,)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_IN_USE",
                "message": "An account with that email already exists.",
                "field": "email",
            },
        )

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (role_code, student_id, email, password_hash,
                               full_name, status)
            SELECT 'alumni', %s, %s, %s, a.first_name || ' ' || a.last_name,
                   'pending_verification'
            FROM alumni a WHERE a.student_id = %s
            """,
            (body.student_id, body.email.lower(), hash_password(body.password),
             body.student_id),
        )

    return Envelope(data=same_answer)


@router.get("/me", response_model=Envelope[MeResponse])
def me(user: Annotated[CurrentUser, Depends(get_current_user)]):
    return Envelope(
        data=MeResponse(
            user_id=user.user_id,
            role=user.role,
            email=user.email,
            student_id=user.student_id,
        )
    )


@router.post("/logout", response_model=Envelope[dict])
def logout(user: Annotated[CurrentUser, Depends(get_current_user)]):
    """
    Client-side token discard.

    The prototype uses stateless JWTs, so there is nothing server-side to
    invalidate; the short expiry in config.py is what bounds a leaked token.
    A denylist table would be the next step if immediate revocation is
    required.
    """
    return Envelope(data={"status": "logged_out"})
