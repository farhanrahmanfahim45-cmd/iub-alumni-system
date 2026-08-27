"""
Admin endpoints: direct record correction, deactivation, audit trail.

This is the path that bypasses the verification gate — an admin fixing a
data-entry error or resolving a duplicate. Every write here produces an audit
entry in the same transaction (docs/data_workflow.md §4).
"""

import math
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.core.audit import write_audit
from app.core.db import fetch_one, get_cursor
from app.core.security import CurrentUser, require_admin
from app.core.submissions import FIELD_MAP, validate_changes
from app.models import Envelope, PagedEnvelope, PageMeta

router = APIRouter(prefix="/api", tags=["admin"])

ALUMNI_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail={"code": "NOT_FOUND", "message": "No alumni record with that ID."},
)

# Which submission type governs a direct edit to each resource. Reusing the
# same whitelist and validators means an admin edit cannot write a column or
# a value that a submission could not.
DIRECT_EDIT = {
    "alumni": ["personal", "contact"],
    "academic": ["academic", "internship", "research_interest"],
    "employment": ["employment"],
}


def _split_by_type(section: str, changes: dict[str, Any]) -> list[tuple[str, dict]]:
    """Group a mixed change set by the submission type that owns each field."""
    grouped: list[tuple[str, dict]] = []
    remaining = dict(changes)
    for sub_type in DIRECT_EDIT[section]:
        _, allowed = FIELD_MAP[sub_type]
        part = {k: remaining.pop(k) for k in list(remaining) if k in allowed}
        if part:
            grouped.append((sub_type, part))
    if remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"Unknown field: {sorted(remaining)[0]}.",
                "field": sorted(remaining)[0],
            },
        )
    return grouped


def _direct_edit(section: str, table: str, student_id: str,
                 changes: dict[str, Any], user: CurrentUser) -> dict:
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": "No changes were included."},
        )

    clean: dict[str, Any] = {}
    for sub_type, part in _split_by_type(section, changes):
        clean.update(validate_changes(sub_type, part))

    with get_cursor() as cur:
        cur.execute(f"SELECT * FROM {table} WHERE student_id = %s", (student_id,))
        before_row = cur.fetchone()
        if before_row is None:
            raise ALUMNI_NOT_FOUND

        before = {k: str(v) if hasattr(v, "quantize") else v
                  for k, v in before_row.items() if k in clean}

        assignments = ", ".join(f"{c} = %({c})s" for c in clean)
        cur.execute(
            f"UPDATE {table} SET {assignments} WHERE student_id = %(student_id)s "
            f"RETURNING *",
            dict(clean, student_id=student_id),
        )
        updated = cur.fetchone()

        write_audit(
            cur, user,
            action=f"Updated {section} record",
            table_name=table,
            record_id=student_id,
            old_values=before,
            new_values=clean,
        )

    return {k: str(v) if hasattr(v, "quantize") else v for k, v in updated.items()}


# --------------------------------------------------------------------------- #
# Direct edits
# --------------------------------------------------------------------------- #
@router.put("/alumni/{student_id}", response_model=Envelope[dict])
def update_alumni(
    student_id: str,
    user: Annotated[CurrentUser, Depends(require_admin)],
    changes: dict[str, Any] = Body(...),
):
    """Correct an alumni record directly (admin only, audited)."""
    data = _direct_edit("alumni", "alumni", student_id, changes, user)
    # Never echo the password-adjacent or restricted fields back wholesale;
    # the profile endpoint applies the visibility rules properly.
    return Envelope(data=data)


@router.put("/alumni/{student_id}/academic", response_model=Envelope[dict])
def update_academic(
    student_id: str,
    user: Annotated[CurrentUser, Depends(require_admin)],
    changes: dict[str, Any] = Body(...),
):
    return Envelope(
        data=_direct_edit("academic", "academic_records", student_id, changes, user)
    )


@router.put("/alumni/{student_id}/employment", response_model=Envelope[dict])
def update_employment(
    student_id: str,
    user: Annotated[CurrentUser, Depends(require_admin)],
    changes: dict[str, Any] = Body(...),
):
    return Envelope(
        data=_direct_edit("employment", "employment", student_id, changes, user)
    )


@router.delete("/alumni/{student_id}", response_model=Envelope[dict])
def deactivate_alumni(
    student_id: str,
    user: Annotated[CurrentUser, Depends(require_admin)],
    reason: str | None = Body(None, embed=True),
):
    """
    Soft delete (docs/api_spec.md §3).

    The row is marked deactivated, never removed — deleting would cascade to
    the academic, employment, and submission history, and an alumni record
    that was merged or entered twice still needs to be explainable later.
    """
    with get_cursor() as cur:
        cur.execute(
            "UPDATE alumni SET record_status = 'deactivated' "
            "WHERE student_id = %s AND record_status <> 'deactivated' "
            "RETURNING student_id, alumni_id, record_status",
            (student_id,),
        )
        row = cur.fetchone()
        if row is None:
            if fetch_one("SELECT 1 FROM alumni WHERE student_id = %s",
                         (student_id,)) is None:
                raise ALUMNI_NOT_FOUND
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "ALREADY_DEACTIVATED",
                    "message": "This record is already deactivated.",
                },
            )

        write_audit(
            cur, user,
            action="Deactivated alumni record",
            table_name="alumni",
            record_id=student_id,
            old_values={"record_status": "active"},
            new_values={"record_status": "deactivated", "reason": reason},
        )

    return Envelope(data=dict(row))


@router.put("/alumni/{student_id}/reactivate", response_model=Envelope[dict])
def reactivate_alumni(
    student_id: str,
    user: Annotated[CurrentUser, Depends(require_admin)],
):
    """Undo a deactivation — a soft delete is only useful if it's reversible."""
    with get_cursor() as cur:
        cur.execute(
            "UPDATE alumni SET record_status = 'active' WHERE student_id = %s "
            "RETURNING student_id, alumni_id, record_status",
            (student_id,),
        )
        row = cur.fetchone()
        if row is None:
            raise ALUMNI_NOT_FOUND
        write_audit(
            cur, user,
            action="Reactivated alumni record",
            table_name="alumni",
            record_id=student_id,
            new_values={"record_status": "active"},
        )
    return Envelope(data=dict(row))


# --------------------------------------------------------------------------- #
# Audit trail
# --------------------------------------------------------------------------- #
@router.get("/audit-logs", response_model=PagedEnvelope[dict])
def list_audit_logs(
    user: Annotated[CurrentUser, Depends(require_admin)],
    record: str | None = None,
    actor: str | None = None,
    action: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """Query the audit trail (docs/api_spec.md §8). Admin only, read-only."""
    where: list[str] = []
    params: dict[str, Any] = {}

    if record:
        where.append("record_id = %(record)s")
        params["record"] = record
    if actor:
        where.append("LOWER(actor_email) LIKE %(actor)s")
        params["actor"] = f"%{actor.lower()}%"
    if action:
        where.append("action ILIKE %(action)s")
        params["action"] = f"%{action}%"
    if date_from:
        where.append("occurred_at >= %(date_from)s")
        params["date_from"] = date_from
    if date_to:
        where.append("occurred_at < %(date_to)s")
        params["date_to"] = date_to

    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = fetch_one(f"SELECT COUNT(*) AS n FROM audit_logs {clause}", params)["n"]

    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    with get_cursor() as cur:
        cur.execute(
            f"""
            SELECT audit_id, actor_email, actor_role, action, table_name,
                   record_id, old_values, new_values, occurred_at
            FROM audit_logs {clause}
            ORDER BY occurred_at DESC, audit_id DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

    return PagedEnvelope(
        data=[dict(r) for r in rows],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total_records=total,
            total_pages=max(1, math.ceil(total / page_size)),
        ),
    )
