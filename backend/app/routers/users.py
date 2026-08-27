"""
User management (docs/api_spec.md §8).

Admin-only. Alumni accounts are not created here — an alumnus claims their
own profile through POST /api/auth/register, which is the only self-service
account path.
"""

import math
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit
from app.core.db import fetch_one, get_cursor
from app.core.security import CurrentUser, hash_password, require_admin
from app.models import (
    Envelope,
    PagedEnvelope,
    PageMeta,
    StaffUserCreate,
    UserSummary,
    UserUpdate,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_summary(row: dict) -> UserSummary:
    return UserSummary(
        user_id=row["user_id"],
        role=row["role_code"],
        email=row["email"],
        full_name=row["full_name"],
        status=row["status"],
        student_id=row["student_id"],
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
    )


@router.get("", response_model=PagedEnvelope[UserSummary])
def list_users(
    user: Annotated[CurrentUser, Depends(require_admin)],
    role: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    where: list[str] = []
    params: dict[str, Any] = {}
    if role:
        where.append("role_code = %(role)s")
        params["role"] = role
    if status_filter:
        where.append("status = %(status)s")
        params["status"] = status_filter

    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = fetch_one(f"SELECT COUNT(*) AS n FROM users {clause}", params)["n"]

    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size
    with get_cursor() as cur:
        # password_hash is never selected — it should not travel further than
        # the login check that needs it.
        cur.execute(
            f"""
            SELECT user_id, role_code, email, full_name, status, student_id,
                   created_at, last_login_at
            FROM users {clause}
            ORDER BY role_code, email
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

    return PagedEnvelope(
        data=[_to_summary(r) for r in rows],
        meta=PageMeta(
            page=page, page_size=page_size, total_records=total,
            total_pages=max(1, math.ceil(total / page_size)),
        ),
    )


@router.post("", response_model=Envelope[UserSummary], status_code=201)
def create_staff_user(
    body: StaffUserCreate,
    user: Annotated[CurrentUser, Depends(require_admin)],
):
    """
    Create a faculty or admin account.

    Only these two roles: an alumni account must be bound to an alumni record,
    which the database enforces (chk_users_student_link), so it cannot be
    created here without a student_id.
    """
    if fetch_one("SELECT 1 FROM users WHERE LOWER(email) = LOWER(%s)",
                 (body.email,)):
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
            INSERT INTO users (role_code, email, password_hash, full_name, status)
            VALUES (%s, %s, %s, %s, 'active')
            RETURNING user_id, role_code, email, full_name, status, student_id,
                      created_at, last_login_at
            """,
            (body.role, body.email.lower(), hash_password(body.password),
             body.full_name),
        )
        row = cur.fetchone()
        write_audit(
            cur, user,
            action=f"Created {body.role} account",
            table_name="users",
            record_id=str(row["user_id"]),
            new_values={"email": body.email.lower(), "role": body.role},
        )

    return Envelope(data=_to_summary(row))


@router.put("/{user_id}", response_model=Envelope[UserSummary])
def update_user(
    user_id: int,
    body: UserUpdate,
    user: Annotated[CurrentUser, Depends(require_admin)],
):
    """
    Change a user's role, status, or name.

    An admin cannot deactivate or demote their own account — that is how a
    system ends up with no administrator at all.
    """
    if user_id == user.user_id and (body.status or body.role):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SELF_MODIFICATION",
                "message": "You can't change your own role or status. "
                           "Ask another admin.",
            },
        )

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": "No changes were included."},
        )
    if "role" in updates:
        updates["role_code"] = updates.pop("role")

    with get_cursor() as cur:
        cur.execute(
            "SELECT user_id, role_code, status, student_id FROM users "
            "WHERE user_id = %s", (user_id,),
        )
        before = cur.fetchone()
        if before is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "NOT_FOUND", "message": "No user with that ID."},
            )
        if "role_code" in updates and before["student_id"] is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "ALUMNI_ROLE_FIXED",
                    "message": "An alumni account can't be changed to a staff role.",
                },
            )

        # Refuse to remove the last active admin.
        if (before["role_code"] == "admin"
                and (updates.get("status") == "deactivated"
                     or updates.get("role_code") == "faculty")):
            remaining = fetch_one(
                "SELECT COUNT(*) AS n FROM users "
                "WHERE role_code = 'admin' AND status = 'active' AND user_id <> %s",
                (user_id,),
            )["n"]
            if remaining == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "LAST_ADMIN",
                        "message": "This is the only active admin account. "
                                   "Promote another admin first.",
                    },
                )

        assignments = ", ".join(f"{k} = %({k})s" for k in updates)
        cur.execute(
            f"""
            UPDATE users SET {assignments} WHERE user_id = %(user_id)s
            RETURNING user_id, role_code, email, full_name, status, student_id,
                      created_at, last_login_at
            """,
            dict(updates, user_id=user_id),
        )
        row = cur.fetchone()

        write_audit(
            cur, user,
            action="Updated user account",
            table_name="users",
            record_id=str(user_id),
            old_values={"role": before["role_code"], "status": before["status"]},
            new_values=updates,
        )

    return Envelope(data=_to_summary(row))
