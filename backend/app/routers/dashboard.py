"""
Analytics endpoints (docs/api_spec.md §7).

Every figure is aggregated in PostgreSQL and returned pre-computed — the
frontend receives numbers to render, never rows to count. Dashboards read
live from the official tables, so a KPI moves as soon as an approval lands
(PRD §37: "KPI values reflect database changes").

Deactivated records are excluded everywhere. A soft-deleted duplicate should
not inflate the totals.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.db import fetch_all, fetch_one
from app.core.security import CurrentUser, require_admin, require_staff
from app.models import CareerDashboard, DataQuality, Envelope, OverviewDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ACTIVE = "a.record_status = 'active'"

# Filter name -> SQL column. Shared by both dashboards so a filter behaves
# identically wherever it appears.
FILTERS = {
    "graduation_year": "a.graduation_year",
    "degree": "a.degree",
    "major": "a.major",
    "minor": "a.minor",
    "employment_status": "e.employment_status",
    "industry": "e.industry",
    "country": "e.country",
}


def _where(values: dict[str, Any]) -> tuple[str, dict]:
    clauses = [ACTIVE]
    params: dict[str, Any] = {}
    for name, value in values.items():
        if value is not None and name in FILTERS:
            clauses.append(f"{FILTERS[name]} = %({name})s")
            params[name] = value
    return " AND ".join(clauses), params


def _counts(sql: str, params: dict, key: str, label: str = "count") -> list[dict]:
    """Run a group-by and return [{key: ..., count: n}] in the API's shape."""
    return [{key: r["k"], label: r["n"]} for r in fetch_all(sql, params)]


# --------------------------------------------------------------------------- #
# Dashboard 1 — Alumni & Academic Overview
# --------------------------------------------------------------------------- #
@router.get("/overview", response_model=Envelope[OverviewDashboard])
def overview(
    user: Annotated[CurrentUser, Depends(require_staff)],
    graduation_year: int | None = None,
    degree: str | None = None,
    major: str | None = None,
    minor: str | None = None,
):
    """Academic overview (PRD §16). Faculty and admin."""
    where, params = _where({
        "graduation_year": graduation_year,
        "degree": degree,
        "major": major,
        "minor": minor,
    })
    # academic_records is 1:1 with alumni (uq_academic_student), so this join
    # cannot multiply rows and inflate the counts.
    frm = f"FROM alumni a LEFT JOIN academic_records ac ON ac.student_id = a.student_id WHERE {where}"

    kpis = fetch_one(
        f"""
        SELECT COUNT(*) AS total_alumni,
               COUNT(*) FILTER (WHERE a.major = 'International Business') AS ib_majors,
               COUNT(*) FILTER (WHERE a.minor = 'International Business') AS ib_minors,
               ROUND(AVG(ac.cgpa), 2) AS average_cgpa,
               COUNT(*) FILTER (WHERE ac.internship_completed = 'Yes') AS internships_completed,
               COUNT(ac.internship_completed) AS internship_records
        {frm}
        """,
        params,
    )

    completed = kpis["internships_completed"] or 0
    recorded = kpis["internship_records"] or 0

    charts = {
        "alumni_by_graduation_year": [
            {"year": r["k"], "count": r["n"]}
            for r in fetch_all(
                f"SELECT a.graduation_year AS k, COUNT(*) AS n {frm} "
                f"AND a.graduation_year IS NOT NULL "
                f"GROUP BY 1 ORDER BY 1",
                params,
            )
        ],
        "degree_distribution": _counts(
            f"SELECT a.degree AS k, COUNT(*) AS n {frm} GROUP BY 1 ORDER BY 2 DESC",
            params, "degree",
        ),
        "major_distribution": _counts(
            f"SELECT a.major AS k, COUNT(*) AS n {frm} GROUP BY 1 ORDER BY 2 DESC",
            params, "major",
        ),
        # Alumni without a minor are excluded rather than shown as a null
        # slice — "no minor" is not a minor.
        "minor_distribution": _counts(
            f"SELECT a.minor AS k, COUNT(*) AS n {frm} AND a.minor IS NOT NULL "
            f"GROUP BY 1 ORDER BY 2 DESC",
            params, "minor",
        ),
        "cgpa_distribution": [
            {"bucket": r["k"], "count": r["n"]}
            for r in fetch_all(
                f"""
                SELECT CASE
                    WHEN ac.cgpa >= 3.75 THEN '3.75 - 4.00'
                    WHEN ac.cgpa >= 3.50 THEN '3.50 - 3.74'
                    WHEN ac.cgpa >= 3.25 THEN '3.25 - 3.49'
                    WHEN ac.cgpa >= 3.00 THEN '3.00 - 3.24'
                    WHEN ac.cgpa >= 2.50 THEN '2.50 - 2.99'
                    ELSE 'Below 2.50'
                END AS k, COUNT(*) AS n
                {frm} AND ac.cgpa IS NOT NULL
                GROUP BY 1 ORDER BY 1 DESC
                """,
                params,
            )
        ],
        "internship_completion": [
            {"status": "Completed" if r["k"] == "Yes" else "Not completed",
             "count": r["n"]}
            for r in fetch_all(
                f"SELECT ac.internship_completed AS k, COUNT(*) AS n {frm} "
                f"AND ac.internship_completed IS NOT NULL GROUP BY 1 ORDER BY 1",
                params,
            )
        ],
        "academic_honors": _counts(
            f"SELECT ac.academic_honors AS k, COUNT(*) AS n {frm} "
            f"AND ac.academic_honors IS NOT NULL GROUP BY 1 ORDER BY 2 DESC",
            params, "honor",
        ),
    }

    return Envelope(
        data=OverviewDashboard(
            kpis={
                "total_alumni": kpis["total_alumni"],
                "ib_majors": kpis["ib_majors"],
                "ib_minors": kpis["ib_minors"],
                "average_cgpa": float(kpis["average_cgpa"]) if kpis["average_cgpa"] else None,
                "internship_completion_rate": (
                    round(completed / recorded, 4) if recorded else None
                ),
            },
            charts=charts,
        ),
        meta={"filters_applied": {k: v for k, v in params.items()}},
    )


# --------------------------------------------------------------------------- #
# Dashboard 2 — Career Landscape
# --------------------------------------------------------------------------- #
@router.get("/career", response_model=Envelope[CareerDashboard])
def career(
    user: Annotated[CurrentUser, Depends(require_staff)],
    graduation_year: int | None = None,
    degree: str | None = None,
    major: str | None = None,
    minor: str | None = None,
    employment_status: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    top_n: int = Query(10, ge=1, le=50),
):
    """Career landscape (PRD §17). Faculty and admin."""
    where, params = _where({
        "graduation_year": graduation_year,
        "degree": degree,
        "major": major,
        "minor": minor,
        "employment_status": employment_status,
        "industry": industry,
        "country": country,
    })
    frm = f"FROM alumni a JOIN employment e ON e.student_id = a.student_id WHERE {where}"

    kpis = fetch_one(
        f"""
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE e.employment_status = 'Employed') AS employed,
               COUNT(*) FILTER (WHERE e.employment_status = 'Seeking Employment') AS seeking_employment,
               COUNT(*) FILTER (WHERE e.employment_status = 'Further Studies') AS further_studies,
               COUNT(*) FILTER (WHERE e.employment_status = 'Self-Employed') AS self_employed
        {frm}
        """,
        params,
    )
    total = kpis["total"] or 0

    params_top = dict(params, top_n=top_n)

    charts = {
        "employment_by_industry": _counts(
            f"SELECT e.industry AS k, COUNT(*) AS n {frm} AND e.industry IS NOT NULL "
            f"GROUP BY 1 ORDER BY 2 DESC",
            params, "industry",
        ),
        "top_employers": [
            {"company": r["k"], "count": r["n"]}
            for r in fetch_all(
                f"SELECT e.company AS k, COUNT(*) AS n {frm} AND e.company IS NOT NULL "
                f"GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT %(top_n)s",
                params_top,
            )
        ],
        "employment_by_job_function": _counts(
            f"SELECT e.job_function AS k, COUNT(*) AS n {frm} "
            f"AND e.job_function IS NOT NULL GROUP BY 1 ORDER BY 2 DESC",
            params, "job_function",
        ),
        "employment_by_country": _counts(
            f"SELECT e.country AS k, COUNT(*) AS n {frm} AND e.country IS NOT NULL "
            f"GROUP BY 1 ORDER BY 2 DESC",
            params, "country",
        ),
        "career_snapshot": [
            {"status": r["k"], "count": r["n"],
             "percentage": round(100.0 * r["n"] / total, 1) if total else 0.0}
            for r in fetch_all(
                f"SELECT e.employment_status AS k, COUNT(*) AS n {frm} "
                f"GROUP BY 1 ORDER BY 2 DESC",
                params,
            )
        ],
        # How many roles each alumnus has held: current + history. A rough
        # proxy for career progression until job titles are ranked.
        "career_progression": [
            {"roles_held": r["k"], "alumni": r["n"]}
            for r in fetch_all(
                f"""
                SELECT roles AS k, COUNT(*) AS n FROM (
                    SELECT a.student_id,
                           1 + (SELECT COUNT(*) FROM employment_history h
                                WHERE h.student_id = a.student_id) AS roles
                    {frm}
                ) t
                GROUP BY 1 ORDER BY 1
                """,
                params,
            )
        ],
        "employment_by_graduation_year": [
            {"year": r["k"], "employed": r["employed"], "total": r["n"]}
            for r in fetch_all(
                f"""
                SELECT a.graduation_year AS k, COUNT(*) AS n,
                       COUNT(*) FILTER (WHERE e.employment_status = 'Employed') AS employed
                {frm} AND a.graduation_year IS NOT NULL
                GROUP BY 1 ORDER BY 1
                """,
                params,
            )
        ],
    }

    return Envelope(
        data=CareerDashboard(
            kpis={
                "total_alumni": total,
                "employed": kpis["employed"],
                "seeking_employment": kpis["seeking_employment"],
                "further_studies": kpis["further_studies"],
                "self_employed": kpis["self_employed"],
                "employment_rate": (
                    round((kpis["employed"] + kpis["self_employed"]) / total, 4)
                    if total else None
                ),
            },
            charts=charts,
        ),
        meta={"filters_applied": {k: v for k, v in params.items()}},
    )


# --------------------------------------------------------------------------- #
# Data quality (admin)
# --------------------------------------------------------------------------- #
@router.get("/data-quality", response_model=Envelope[DataQuality])
def data_quality(user: Annotated[CurrentUser, Depends(require_admin)]):
    """
    Admin data-quality summary (PRD §29).

    Each figure is meant to be clickable in the UI — a worklist, not a report.
    """
    row = fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM alumni a
             WHERE a.record_status = 'active' AND (
                a.phone IS NULL OR a.linkedin_url IS NULL
                OR a.admission_year IS NULL OR a.graduation_year IS NULL
                OR NOT EXISTS (SELECT 1 FROM academic_records ac
                               WHERE ac.student_id = a.student_id)
                OR NOT EXISTS (SELECT 1 FROM employment e
                               WHERE e.student_id = a.student_id)
             )) AS incomplete_profiles,

            (SELECT COUNT(*) FROM alumni_submissions
             WHERE status IN ('Pending', 'Correction Required')) AS pending_verification,

            (SELECT COUNT(*) FROM (
                SELECT LOWER(first_name || ' ' || last_name) AS n
                FROM alumni WHERE record_status = 'active'
                GROUP BY 1 HAVING COUNT(*) > 1
             ) d) AS potential_duplicates,

            (SELECT COUNT(*) FROM alumni a
             WHERE a.record_status = 'active'
               AND NOT EXISTS (SELECT 1 FROM employment e
                               WHERE e.student_id = a.student_id)) AS missing_employment_info,

            (SELECT COUNT(*) FROM alumni a
             LEFT JOIN academic_records ac ON ac.student_id = a.student_id
             WHERE a.record_status = 'active' AND ac.cgpa IS NULL) AS missing_cgpa,

            (SELECT COUNT(*) FROM alumni a
             JOIN academic_records ac ON ac.student_id = a.student_id
             WHERE a.record_status = 'active' AND a.degree = 'BBA'
               AND ac.internship_completed <> 'Yes') AS bba_without_internship,

            (SELECT COUNT(*) FROM alumni
             WHERE record_status = 'deactivated') AS deactivated_records,

            (SELECT COUNT(*) FROM alumni a
             WHERE a.record_status = 'active'
               AND NOT EXISTS (SELECT 1 FROM users u
                               WHERE u.student_id = a.student_id)) AS unclaimed_profiles
        """
    )
    return Envelope(data=DataQuality(**row))
