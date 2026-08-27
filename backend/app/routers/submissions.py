"""
Submission endpoints (docs/api_spec.md §6).

The lifecycle this implements:

    Submit → Validate → Pending → Admin review
                                    ├─ Approve            → official tables + audit
                                    ├─ Reject             → nothing written
                                    └─ Correction Required → back to the alumnus

Only `approve` writes to the official tables, and it does so in the same
transaction as the audit entry.
"""

import math
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from app.core.audit import write_audit
from app.core.db import fetch_one, get_cursor
from app.core.security import CurrentUser, get_current_user, require_admin
from app.core.submissions import (
    FIELD_MAP,
    apply_submission,
    snapshot_current,
    validate_changes,
)
from app.models import (
    Envelope,
    PagedEnvelope,
    PageMeta,
    SubmissionCreate,
    SubmissionSummary,
)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail={"code": "NOT_FOUND", "message": "No submission with that ID."},
)

OPEN_STATES = ("Pending", "Correction Required")


def _row_to_summary(row: dict) -> SubmissionSummary:
    return SubmissionSummary(
        submission_id=row["submission_id"],
        student_id=row["student_id"],
        submission_type=row["submission_type"],
        status=row["status"],
        submitted_at=row["submitted_at"],
        reviewed_at=row["reviewed_at"],
        review_note=row["review_note"],
        current_values=row["current_values"],
        proposed_values=row["proposed_values"],
    )


def _load(cur, submission_id: int) -> dict:
    cur.execute(
        "SELECT * FROM alumni_submissions WHERE submission_id = %s", (submission_id,)
    )
    row = cur.fetchone()
    if row is None:
        raise NOT_FOUND
    return row


# --------------------------------------------------------------------------- #
# Create
# --------------------------------------------------------------------------- #
@router.post("", response_model=Envelope[SubmissionSummary], status_code=201)
def create_submission(
    body: SubmissionCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """
    Submit a change for review. Alumni only, for their own record.

    This is the only way alumni-originated data enters the system. Faculty and
    admin are refused here rather than silently allowed — an admin correcting
    a record uses the direct write endpoints, which are audited differently.
    """
    if user.role != "alumni" or not user.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Only alumni submit changes for review.",
            },
        )

    clean = validate_changes(body.submission_type, body.proposed_changes)

    with get_cursor() as cur:
        current = snapshot_current(
            cur, body.submission_type, user.student_id, list(clean)
        )
        cur.execute(
            """
            INSERT INTO alumni_submissions
                (student_id, submitted_by, submission_type,
                 current_values, proposed_values, status)
            VALUES (%s, %s, %s, %s, %s, 'Pending')
            RETURNING *
            """,
            (
                user.student_id,
                user.user_id,
                body.submission_type,
                Jsonb(current) if current is not None else None,
                Jsonb(clean),
            ),
        )
        row = cur.fetchone()

    return Envelope(data=_row_to_summary(row))


# --------------------------------------------------------------------------- #
# List / read
# --------------------------------------------------------------------------- #
@router.get("", response_model=PagedEnvelope[SubmissionSummary])
def list_submissions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    status_filter: str | None = Query(None, alias="status"),
    student_id: str | None = None,
    submission_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """
    Admins see every submission (the Verification Center queue).
    Alumni see only their own, for tracking status (PRD §9).
    Faculty have no access — they are read-only on records, not reviewers.
    """
    if user.role == "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Submissions are reviewed by admins."},
        )

    where: list[str] = []
    params: dict[str, Any] = {}

    if user.role == "alumni":
        # Scoped to the token, not to any student_id in the query string.
        where.append("student_id = %(own)s")
        params["own"] = user.student_id
    elif student_id:
        where.append("student_id = %(student_id)s")
        params["student_id"] = student_id

    if status_filter:
        where.append("status = %(status)s")
        params["status"] = status_filter
    if submission_type:
        where.append("submission_type = %(submission_type)s")
        params["submission_type"] = submission_type

    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = fetch_one(
        f"SELECT COUNT(*) AS n FROM alumni_submissions {clause}", params
    )["n"]

    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    with get_cursor() as cur:
        cur.execute(
            f"""
            SELECT * FROM alumni_submissions {clause}
            ORDER BY
                CASE status WHEN 'Pending' THEN 0
                            WHEN 'Correction Required' THEN 1 ELSE 2 END,
                submitted_at
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        rows = cur.fetchall()

    return PagedEnvelope(
        data=[_row_to_summary(r) for r in rows],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total_records=total,
            total_pages=max(1, math.ceil(total / page_size)),
        ),
    )


@router.get("/{submission_id}", response_model=Envelope[SubmissionSummary])
def get_submission(
    submission_id: int,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    with get_cursor() as cur:
        row = _load(cur, submission_id)

    if user.role == "alumni" and row["student_id"] != user.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You can only view your own submissions."},
        )
    if user.role == "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Submissions are reviewed by admins."},
        )

    return Envelope(data=_row_to_summary(row))


# --------------------------------------------------------------------------- #
# Review actions (admin)
# --------------------------------------------------------------------------- #
@router.put("/{submission_id}/approve", response_model=Envelope[SubmissionSummary])
def approve(
    submission_id: int,
    user: Annotated[CurrentUser, Depends(require_admin)],
    note: str | None = Body(None, embed=True),
):
    """
    Approve a submission and write it into the official record.

    The update, the status change, and the audit entry share one transaction.
    If a database constraint rejects the value, everything rolls back — the
    submission cannot end up marked Approved with nothing applied.
    """
    with get_cursor() as cur:
        row = _load(cur, submission_id)
        if row["status"] not in OPEN_STATES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "ALREADY_REVIEWED",
                    "message": f"This submission was already {row['status'].lower()}.",
                },
            )

        proposed = row["proposed_values"]
        # Re-read the official values now, rather than trusting the snapshot
        # taken when the alumnus submitted — the record may have moved on.
        before = snapshot_current(
            cur, row["submission_type"], row["student_id"], list(proposed)
        )

        apply_submission(cur, row["submission_type"], row["student_id"], proposed)

        cur.execute(
            """
            UPDATE alumni_submissions
            SET status = 'Approved', reviewed_by = %s, reviewed_at = now(),
                applied_at = now(), review_note = %s
            WHERE submission_id = %s
            RETURNING *
            """,
            (user.user_id, note, submission_id),
        )
        updated = cur.fetchone()

        table, _ = FIELD_MAP[row["submission_type"]]
        write_audit(
            cur,
            user,
            action=f"Approved {row['submission_type']} submission",
            table_name=table,
            record_id=row["student_id"],
            old_values=before,
            new_values=proposed,
        )

    return Envelope(data=_row_to_summary(updated))


@router.put("/{submission_id}/reject", response_model=Envelope[SubmissionSummary])
def reject(
    submission_id: int,
    user: Annotated[CurrentUser, Depends(require_admin)],
    reason: str = Body(..., embed=True, min_length=1),
):
    """Reject a submission. The official record is left untouched."""
    with get_cursor() as cur:
        row = _load(cur, submission_id)
        if row["status"] not in OPEN_STATES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "ALREADY_REVIEWED",
                    "message": f"This submission was already {row['status'].lower()}.",
                },
            )

        cur.execute(
            """
            UPDATE alumni_submissions
            SET status = 'Rejected', reviewed_by = %s, reviewed_at = now(),
                review_note = %s
            WHERE submission_id = %s
            RETURNING *
            """,
            (user.user_id, reason, submission_id),
        )
        updated = cur.fetchone()

        write_audit(
            cur,
            user,
            action=f"Rejected {row['submission_type']} submission",
            table_name="alumni_submissions",
            record_id=row["student_id"],
            new_values={"reason": reason},
        )

    return Envelope(data=_row_to_summary(updated))


@router.put(
    "/{submission_id}/request-correction", response_model=Envelope[SubmissionSummary]
)
def request_correction(
    submission_id: int,
    user: Annotated[CurrentUser, Depends(require_admin)],
    comments: str = Body(..., embed=True, min_length=1),
):
    """
    Send a submission back for correction rather than rejecting it outright.

    The alumnus can edit and resubmit; the record stays untouched meanwhile.
    """
    with get_cursor() as cur:
        row = _load(cur, submission_id)
        if row["status"] != "Pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "NOT_PENDING",
                    "message": "Only a pending submission can be sent back.",
                },
            )

        cur.execute(
            """
            UPDATE alumni_submissions
            SET status = 'Correction Required', reviewed_by = %s,
                reviewed_at = now(), review_note = %s
            WHERE submission_id = %s
            RETURNING *
            """,
            (user.user_id, comments, submission_id),
        )
        updated = cur.fetchone()

        write_audit(
            cur,
            user,
            action=f"Requested correction on {row['submission_type']} submission",
            table_name="alumni_submissions",
            record_id=row["student_id"],
            new_values={"comments": comments},
        )

    return Envelope(data=_row_to_summary(updated))


# --------------------------------------------------------------------------- #
# Resubmit (alumni)
# --------------------------------------------------------------------------- #
@router.put("/{submission_id}", response_model=Envelope[SubmissionSummary])
def resubmit(
    submission_id: int,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    proposed_changes: dict[str, Any] = Body(..., embed=True),
):
    """
    Update a submission that was sent back and return it to the queue.

    Only the owner, and only from 'Correction Required' — an alumnus cannot
    edit a submission an admin is already reviewing, nor reopen a decided one.
    """
    with get_cursor() as cur:
        row = _load(cur, submission_id)

        if user.role != "alumni" or row["student_id"] != user.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": "You can only update your own submissions.",
                },
            )
        if row["status"] != "Correction Required":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "NOT_CORRECTABLE",
                    "message": "Only a submission sent back for correction can be updated.",
                },
            )

        clean = validate_changes(row["submission_type"], proposed_changes)
        current = snapshot_current(
            cur, row["submission_type"], row["student_id"], list(clean)
        )

        # reviewed_by / reviewed_at are cleared because the database requires
        # a Pending submission to have neither (chk_submission_review_state).
        cur.execute(
            """
            UPDATE alumni_submissions
            SET proposed_values = %s, current_values = %s, status = 'Pending',
                reviewed_by = NULL, reviewed_at = NULL, review_note = NULL,
                submitted_at = now()
            WHERE submission_id = %s
            RETURNING *
            """,
            (Jsonb(clean), Jsonb(current) if current is not None else None,
             submission_id),
        )
        updated = cur.fetchone()

    return Envelope(data=_row_to_summary(updated))
