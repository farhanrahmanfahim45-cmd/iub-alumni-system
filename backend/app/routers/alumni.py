"""
Alumni endpoints: directory, profile, academic, employment, history.

Read-only in this slice. Admin writes and the submission workflow are
separate routers so the write paths can be reviewed independently.
"""

import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.db import fetch_all, fetch_one
from app.core.security import (
    CurrentUser,
    assert_can_read_alumni,
    can_see_contact_details,
    get_current_user,
    require_staff,
)
from app.models import (
    AcademicRecord,
    AlumniProfile,
    CurrentEmployment,
    DirectoryRow,
    EmploymentHistoryEntry,
    Envelope,
    PagedEnvelope,
    PageMeta,
)

router = APIRouter(prefix="/api/alumni", tags=["alumni"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail={"code": "NOT_FOUND", "message": "No alumni record with that ID."},
)

SORTABLE = {
    "name": "a.last_name",
    "student_id": "a.student_id",
    "graduation_year": "a.graduation_year",
    "degree": "a.degree",
    "major": "a.major",
    "company": "e.company",
}


def _to_bool(value: str | None) -> bool | None:
    """internship_completed is stored as 'Yes'/'No' text; expose a boolean."""
    if value is None:
        return None
    return value == "Yes"


# --------------------------------------------------------------------------- #
# Directory
# --------------------------------------------------------------------------- #
@router.get("", response_model=PagedEnvelope[DirectoryRow])
def list_alumni(
    user: Annotated[CurrentUser, Depends(require_staff)],
    name: str | None = None,
    student_id: str | None = None,
    alumni_id: str | None = None,
    email: str | None = None,
    company: str | None = None,
    degree: str | None = None,
    major: str | None = None,
    minor: str | None = None,
    graduation_year: int | None = None,
    employment_status: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    include_inactive: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
):
    """
    Alumni Directory search and filter (PRD §11). Faculty and admin only.

    Contact details are never included here — see DirectoryRow.
    """
    where: list[str] = []
    params: dict = {}

    if not include_inactive:
        where.append("a.record_status = 'active'")

    if name:
        where.append(
            "(LOWER(a.first_name) LIKE %(name)s OR LOWER(a.last_name) LIKE %(name)s "
            "OR LOWER(a.first_name || ' ' || a.last_name) LIKE %(name)s)"
        )
        params["name"] = f"%{name.lower()}%"
    if student_id:
        where.append("a.student_id LIKE %(student_id)s")
        params["student_id"] = f"%{student_id}%"
    if alumni_id:
        where.append("UPPER(a.alumni_id) LIKE %(alumni_id)s")
        params["alumni_id"] = f"%{alumni_id.upper()}%"
    if email:
        # Searchable by staff even though it is not returned in the results.
        where.append("LOWER(a.personal_email) LIKE %(email)s")
        params["email"] = f"%{email.lower()}%"
    if company:
        where.append("LOWER(e.company) LIKE %(company)s")
        params["company"] = f"%{company.lower()}%"

    for field, column in [
        ("degree", "a.degree"),
        ("major", "a.major"),
        ("minor", "a.minor"),
        ("graduation_year", "a.graduation_year"),
        ("employment_status", "e.employment_status"),
        ("industry", "e.industry"),
        ("country", "e.country"),
    ]:
        value = locals()[field]
        if value is not None:
            where.append(f"{column} = %({field})s")
            params[field] = value

    clause = f"WHERE {' AND '.join(where)}" if where else ""
    base = f"FROM alumni a LEFT JOIN employment e ON e.student_id = a.student_id {clause}"

    total = fetch_one(f"SELECT COUNT(*) AS n {base}", params)["n"]

    order_column = SORTABLE.get(sort_by, "a.last_name")
    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    rows = fetch_all(
        f"""
        SELECT a.student_id, a.alumni_id, a.first_name, a.last_name,
               a.degree, a.major, a.minor, a.graduation_year,
               e.company, e.employment_status
        {base}
        ORDER BY {order_column} {sort_order.upper()} NULLS LAST, a.student_id
        LIMIT %(limit)s OFFSET %(offset)s
        """,
        params,
    )

    return PagedEnvelope(
        data=[
            DirectoryRow(
                student_id=r["student_id"],
                alumni_id=r["alumni_id"],
                name=f"{r['first_name']} {r['last_name']}",
                degree=r["degree"],
                major=r["major"],
                minor=r["minor"],
                graduation_year=r["graduation_year"],
                company=r["company"],
                employment_status=r["employment_status"],
            )
            for r in rows
        ],
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total_records=total,
            total_pages=max(1, math.ceil(total / page_size)),
        ),
    )


# --------------------------------------------------------------------------- #
# Single profile
# --------------------------------------------------------------------------- #
@router.get("/{student_id}", response_model=Envelope[AlumniProfile])
def get_alumni(
    student_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Full profile. Alumni may request only their own record."""
    assert_can_read_alumni(user, student_id)

    row = fetch_one("SELECT * FROM alumni WHERE student_id = %s", (student_id,))
    if row is None:
        raise NOT_FOUND

    show_contact = can_see_contact_details(user, student_id)

    profile = AlumniProfile(
        student_id=row["student_id"],
        alumni_id=row["alumni_id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        degree=row["degree"],
        major=row["major"],
        minor=row["minor"],
        admission_year=row["admission_year"],
        graduation_year=row["graduation_year"],
        linkedin_url=row["linkedin_url"],
        record_status=row.get("record_status", "active"),
        contact_details_visible=show_contact,
        # Omitted entirely when not permitted, rather than sent and hidden
        # by the frontend.
        personal_email=row["personal_email"] if show_contact else None,
        institutional_email=row.get("institutional_email") if show_contact else None,
        phone=row["phone"] if show_contact else None,
        academic=_academic(student_id),
        current_employment=_employment(student_id),
        employment_history=_history(student_id),
    )
    return Envelope(data=profile)


# --------------------------------------------------------------------------- #
# Sub-resources
# --------------------------------------------------------------------------- #
def _academic(student_id: str) -> AcademicRecord | None:
    row = fetch_one(
        "SELECT * FROM academic_records WHERE student_id = %s", (student_id,)
    )
    if row is None:
        return None
    return AcademicRecord(
        student_id=row["student_id"],
        cgpa=float(row["cgpa"]) if row["cgpa"] is not None else None,
        academic_honors=row["academic_honors"],
        internship_completed=_to_bool(row["internship_completed"]),
        internship_organization=row["internship_organization"],
        internship_position=row["internship_position"],
        internship_industry=row["internship_industry"],
        research_interest=row["research_interest"],
    )


def _employment(student_id: str) -> CurrentEmployment | None:
    row = fetch_one("SELECT * FROM employment WHERE student_id = %s", (student_id,))
    if row is None:
        return None
    return CurrentEmployment(**{
        k: row[k]
        for k in (
            "student_id", "employment_status", "company", "job_title",
            "industry", "job_function", "country", "city", "start_year",
        )
    })


def _history(student_id: str) -> list[EmploymentHistoryEntry]:
    rows = fetch_all(
        """
        SELECT * FROM employment_history
        WHERE student_id = %s
        ORDER BY start_year DESC NULLS LAST, employment_history_id
        """,
        (student_id,),
    )
    return [
        EmploymentHistoryEntry(**{
            k: r[k]
            for k in (
                "employment_history_id", "company", "job_title", "industry",
                "job_function", "country", "city", "start_year", "end_year",
            )
        })
        for r in rows
    ]


@router.get("/{student_id}/academic", response_model=Envelope[AcademicRecord])
def get_academic(
    student_id: str, user: Annotated[CurrentUser, Depends(get_current_user)]
):
    assert_can_read_alumni(user, student_id)
    record = _academic(student_id)
    if record is None:
        raise NOT_FOUND
    return Envelope(data=record)


@router.get("/{student_id}/employment", response_model=Envelope[CurrentEmployment])
def get_employment(
    student_id: str, user: Annotated[CurrentUser, Depends(get_current_user)]
):
    assert_can_read_alumni(user, student_id)
    record = _employment(student_id)
    if record is None:
        raise NOT_FOUND
    return Envelope(data=record)


@router.get(
    "/{student_id}/employment-history",
    response_model=Envelope[list[EmploymentHistoryEntry]],
)
def get_employment_history(
    student_id: str, user: Annotated[CurrentUser, Depends(get_current_user)]
):
    """Zero, one, or many entries. An empty list is a valid answer."""
    assert_can_read_alumni(user, student_id)
    if fetch_one("SELECT 1 FROM alumni WHERE student_id = %s", (student_id,)) is None:
        raise NOT_FOUND
    return Envelope(data=_history(student_id))
